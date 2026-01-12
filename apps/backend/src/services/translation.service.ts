import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mutex } from 'async-mutex';
import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseSync, stringifySync, Node } from 'subtitle';

import { SubtitleRepository } from '../repositories/subtitle.repository';
import { StorageRepository } from '../repositories/storage.repository';
import { ProcessRegistry } from './process-registry.service';
import { logger } from '../utils/logger';

export class TranslationService extends EventEmitter {
  private genAI: GoogleGenerativeAI;
  private mutex = new Mutex();

  constructor(
    private subtitleRepo: SubtitleRepository,
    private storageRepo: StorageRepository,
    private processRegistry: ProcessRegistry,
  ) {
    super();
    const apiKey = process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      logger.warn('GOOGLE_API_KEY is not set. Translation will fail.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async recoverTranslations() {
    logger.info('Checking for stuck translations...');
    const stuck = await this.subtitleRepo.findByStatus('TRANSLATING');
    if (stuck.length > 0) {
      logger.info(`Found ${stuck.length} stuck translations. Marking as ERROR.`);
      for (const subtitle of stuck) {
        await this.subtitleRepo.update(subtitle.id, { status: 'ERROR' });
        this.emit('progress', { subtitleId: subtitle.id, progress: 0, status: 'ERROR' });
      }
    }
  }

  async translateSubtitle(subtitleId: string, targetLanguage: string, options?: { chunkSize?: number }) {
    if (this.processRegistry.isTaskActive(subtitleId)) {
      logger.warn(`Task ${subtitleId} is already active, skipping.`);
      return;
    }

    logger.info(`Translation requested for ${subtitleId} to ${targetLanguage} (chunkSize: ${options?.chunkSize || 'default'})`);
    this.processRegistry.registerTask(subtitleId);

    return this.mutex.runExclusive(async () => {
      try {
        const subtitle = await this.subtitleRepo.findById(subtitleId);
        if (!subtitle) {
          logger.error(`Subtitle ${subtitleId} not found in database`);
          throw new Error('Subtitle not found');
        }

        logger.info(`Updating status to TRANSLATING for ${subtitleId}`);
        await this.subtitleRepo.update(subtitleId, {
          status: 'TRANSLATING',
          targetLanguage,
          progress: 0,
        });

        this.emit('progress', { subtitleId, progress: 0, status: 'TRANSLATING' });

        logger.info(`Reading file ${subtitle.originalFilePath}`);
        const originalContent = await this.storageRepo.readFile(subtitle.originalFilePath);

        const ext = path.extname(subtitle.originalFileName).toLowerCase();
        let translatedContent = '';

        if (ext === '.srt' || ext === '.vtt') {
          const nodes = parseSync(originalContent);
          const cues = nodes.filter((node) => node.type === 'cue');
          const nonCues = nodes.filter((node) => node.type !== 'cue'); // Headers/footers

          const chunkSize = options?.chunkSize || 40;
          const totalChunks = Math.ceil(cues.length / chunkSize);
          logger.info(`Detected ${cues.length} cues, ${totalChunks} chunks`);

          const translatedCues: Node[] = [];

          for (let i = 0; i < totalChunks; i++) {
            const startIndex = i * chunkSize;
            const chunkCues = cues.slice(startIndex, (i + 1) * chunkSize);

            logger.info(`Translating chunk ${i + 1}/${totalChunks} for ${subtitleId} (${chunkCues.length} cues)`);
            const translatedTexts = await this.translateCuesStructured(chunkCues, targetLanguage);

            for (let j = 0; j < chunkCues.length; j++) {
              const cue = chunkCues[j];
              if (translatedTexts[j]) {
                (cue as any).data.text = translatedTexts[j];
              } else {
                logger.warn(`Missing translation for cue ${startIndex + j + 1} in chunk ${i + 1}, keeping original.`);
              }
              translatedCues.push(cue);
            }

            const progress = Math.round(((i + 1) / totalChunks) * 100);
            await this.subtitleRepo.update(subtitleId, { progress });
            this.emit('progress', { subtitleId, progress, status: 'TRANSLATING' });
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Combine with non-cues (preserving headers)
          translatedContent = stringifySync([...nonCues, ...translatedCues], { format: ext.slice(1) as any });
        } else {
          // Fallback for TXT files - now using structured tagging too!
          // We keep empty lines to ensure the structure remains 100% intact
          const lines = originalContent.split(/\r?\n/);
          const chunkSize = options?.chunkSize || 40;
          const totalChunks = Math.ceil(lines.length / chunkSize);
          logger.info(`Detected ${lines.length} lines, ${totalChunks} chunks`);

          for (let i = 0; i < totalChunks; i++) {
            const startIndex = i * chunkSize;
            const chunkLines = lines.slice(startIndex, (i + 1) * chunkSize);

            logger.info(`Translating line chunk ${i + 1}/${totalChunks} for ${subtitleId} (${chunkLines.length} lines)`);
            const translatedLines = await this.translateLinesStructured(chunkLines, targetLanguage);

            translatedContent += (translatedContent ? '\n' : '') + translatedLines.join('\n');

            const progress = Math.round(((i + 1) / totalChunks) * 100);
            await this.subtitleRepo.update(subtitleId, { progress });
            this.emit('progress', { subtitleId, progress, status: 'TRANSLATING' });
          }
        }

        const translatedFileName = `${uuidv4()}_${targetLanguage}${path.extname(subtitle.originalFileName)}`;
        logger.info(`Writing translated file to ${translatedFileName}`);
        await this.storageRepo.saveFile(translatedFileName, translatedContent);

        await this.subtitleRepo.update(subtitleId, {
          status: 'COMPLETED',
          translatedFilePath: translatedFileName,
          progress: 100,
        });

        this.emit('progress', { subtitleId, progress: 100, status: 'COMPLETED' });
        logger.info(`Translation COMPLETED for ${subtitleId}`);
      } catch (error: any) {
        logger.error(`Translation error for ${subtitleId}:`, error);
        await this.subtitleRepo.update(subtitleId, { status: 'ERROR' });
        this.emit('progress', { subtitleId, progress: 0, status: 'ERROR' });
        throw error;
      } finally {
        this.processRegistry.deregisterTask(subtitleId);
      }
    });
  }

  private async translateCuesStructured(chunkCues: Node[], targetLanguage: string): Promise<string[]> {
    const modelName = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({ model: modelName });

    const taggedInput = chunkCues
      .map((node, i) => {
        const text = (node as any).data.text;
        return `<S-${i}>\n${text}\n</S-${i}>`;
      })
      .join('\n');

    const prompt = `Translate the following movie subtitles into ${targetLanguage}. 
IMPORTANT: 
1. You are translating for a movie or show. Maintain a natural, conversational style relative to the context. 
2. Maintain all formatting tags (e.g., <i>, <b>), new lines within the text, and special characters. 
3. Each subtitle segment is enclosed in <S-N> and </S-N> tags. 
4. You MUST return exactly the same number of segments, each with its original <S-N> and </S-N> tags. 
5. DO NOT MERGE multiple segments into one. Even if a sentence spans across multiple segments, translate the portion within each segment's tags and do not combine them. 
6. Do translate idioms and phrases naturally, considering cultural context.
7. Do translate content in parentheses or brackets that provide additional context.
8. Return ONLY the segments with their tags. Do not add any introductory or concluding text.

Input:
${taggedInput}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      const translatedTexts: string[] = new Array(chunkCues.length).fill('');
      for (let i = 0; i < chunkCues.length; i++) {
        // Use a regex that handles potential whitespace and is case-insensitive
        const regex = new RegExp(`<S-${i}>([\\s\\S]*?)</S-${i}>`, 'i');
        const match = responseText.match(regex);
        if (match) {
          translatedTexts[i] = match[1].trim();
        } else {
          logger.warn(`Could not find translation for segment <S-${i}> in response`);
        }
      }
      return translatedTexts;
    } catch (err: any) {
      logger.error('Gemini API Error in structured translation:', err);
      throw err;
    }
  }

  private async translateLinesStructured(lines: string[], targetLanguage: string): Promise<string[]> {
    const modelName = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({ model: modelName });

    const taggedInput = lines
      .map((line, i) => {
        if (!line.trim()) return `<L-${i}></L-${i}>`;
        return `<L-${i}>${line}</L-${i}>`;
      })
      .join('\n');

    const prompt = `Translate the following text into ${targetLanguage}. 
IMPORTANT: 
1. Maintain the natural flow of the text. 
2. Each line is enclosed in <L-N> and </L-N> tags. 
3. You MUST return exactly the same number of lines, each with its original <L-N> and </L-N> tags. 
4. DO NOT MERGE multiple lines into one.
5. If a line is empty between tags, return it empty.
6. Return ONLY the lines with their tags. Do not add any introductory or concluding text.

Input:
${taggedInput}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      const translatedLines: string[] = new Array(lines.length).fill('');
      for (let i = 0; i < lines.length; i++) {
        const regex = new RegExp(`<L-${i}>([\\s\\S]*?)</L-${i}>`, 'i');
        const match = responseText.match(regex);
        if (match) {
          translatedLines[i] = match[1].trim();
        } else {
          logger.warn(`Could not find translation for line <L-${i}>, keeping original.`);
          translatedLines[i] = lines[i];
        }
      }
      return translatedLines;
    } catch (err: any) {
      logger.error('Gemini API Error in structured line translation:', err);
      throw err;
    }
  }

  private async translateChunk(text: string, targetLanguage: string): Promise<string> {
    const modelName = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({ model: modelName });

    const prompt = `Translate the following text into ${targetLanguage}. 
IMPORTANT: 
1. Those are subtitles for a movie or an episode of a show. Preserve the format exactly as in the input.
2. If the input contains timing information or index numbers (like in .srt or .vtt), keep them EXACTLY as they are.
3. Only translate the actual spoken text or sentences.
4. Maintain all formatting tags (like <i>, <b>), new lines, and special characters.
5. Do not include any intro, outro, or explanations. Return ONLY the translated content in the same format.
6. Do translate idioms and phrases naturally, considering cultural context.
7. Do translate content in parentheses or brackets that provide additional context.

Input:
${text}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (err: any) {
      logger.error('Gemini API Error:', err);
      throw err;
    }
  }
}
