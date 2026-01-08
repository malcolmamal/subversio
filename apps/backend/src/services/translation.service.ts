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

  async translateSubtitle(subtitleId: string, targetLanguage: string) {
    if (this.processRegistry.isTaskActive(subtitleId)) {
      logger.warn(`Task ${subtitleId} is already active, skipping.`);
      return;
    }

    logger.info(`Translation requested for ${subtitleId} to ${targetLanguage}`);
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

          const chunkSize = 30;
          const totalChunks = Math.ceil(cues.length / chunkSize);
          logger.info(`Detected ${cues.length} cues, ${totalChunks} chunks`);

          const translatedCues: Node[] = [];

          for (let i = 0; i < totalChunks; i++) {
            const chunkCues = cues.slice(i * chunkSize, (i + 1) * chunkSize);
            const chunkText = stringifySync(chunkCues, { format: ext.slice(1) as any });

            logger.info(`Translating chunk ${i + 1}/${totalChunks} for ${subtitleId}`);
            const translatedChunkText = await this.translateChunk(chunkText, targetLanguage);

            // Re-parse the translated chunk to get nodes back
            const translatedNodes = parseSync(translatedChunkText);
            translatedCues.push(...translatedNodes.filter((n) => n.type === 'cue'));

            const progress = Math.round(((i + 1) / totalChunks) * 100);
            await this.subtitleRepo.update(subtitleId, { progress });
            this.emit('progress', { subtitleId, progress, status: 'TRANSLATING' });
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Combine with non-cues (preserving headers)
          translatedContent = stringifySync([...nonCues, ...translatedCues], { format: ext.slice(1) as any });
        } else {
          // Fallback for TXT files
          const lines = originalContent.split(/\r?\n/);
          const chunkSize = 50;
          const totalChunks = Math.ceil(lines.length / chunkSize);

          for (let i = 0; i < totalChunks; i++) {
            const chunkLines = lines.slice(i * chunkSize, (i + 1) * chunkSize);
            const chunkText = chunkLines.join('\n');
            const translatedChunk = await this.translateChunk(chunkText, targetLanguage);
            translatedContent += (translatedContent ? '\n' : '') + translatedChunk;

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
