import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mutex } from 'async-mutex';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const mutex = new Mutex();

export class TranslationService {
  private genAI: GoogleGenerativeAI;
  private uploadsDir = path.join(__dirname, '../../uploads');

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async translateSubtitle(subtitleId: string, targetLanguage: string) {
    return mutex.runExclusive(async () => {
      const subtitle = await prisma.subtitle.findUnique({ where: { id: subtitleId } });
      if (!subtitle) throw new Error('Subtitle not found');

      try {
        await prisma.subtitle.update({
          where: { id: subtitleId },
          data: { status: 'TRANSLATING', targetLanguage, progress: 0 }
        });

        const originalPath = path.join(this.uploadsDir, subtitle.originalFilePath);
        const originalContent = fs.readFileSync(originalPath, 'utf-8');

        // Simple chunking logic (by blocks)
        const blocks = this.splitIntoBlocks(originalContent, subtitle.originalFileName);
        const chunkSize = 30; // 30 blocks per chunk
        const totalChunks = Math.ceil(blocks.length / chunkSize);
        
        let translatedContent = '';
        
        for (let i = 0; i < totalChunks; i++) {
          const chunkBlocks = blocks.slice(i * chunkSize, (i + 1) * chunkSize);
          const chunkText = chunkBlocks.join('\n\n');
          
          const translatedChunk = await this.translateChunk(chunkText, targetLanguage);
          translatedContent += (translatedContent ? '\n\n' : '') + translatedChunk;
          
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          await prisma.subtitle.update({
            where: { id: subtitleId },
            data: { progress }
          });
          
          // Small delay to respect rate limits if needed
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const translatedFileName = `${uuidv4()}_${targetLanguage}${path.extname(subtitle.originalFileName)}`;
        const translatedPath = path.join(this.uploadsDir, translatedFileName);
        fs.writeFileSync(translatedPath, translatedContent);

        await prisma.subtitle.update({
          where: { id: subtitleId },
          data: {
            status: 'COMPLETED',
            translatedFilePath: translatedFileName,
            progress: 100
          }
        });

      } catch (error: any) {
        console.error('Translation error:', error);
        await prisma.subtitle.update({
          where: { id: subtitleId },
          data: { status: 'ERROR' }
        });
        throw error;
      }
    });
  }

  private splitIntoBlocks(content: string, fileName: string): string[] {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.srt' || ext === '.vtt') {
      // Split by double newline which usually separates blocks
      return content.trim().split(/\r?\n\r?\n/);
    } else {
      // For TXT, split by lines or paragraphs
      return content.trim().split(/\r?\n/);
    }
  }

  private async translateChunk(text: string, targetLanguage: string): Promise<string> {
    const modelName = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({ model: modelName });

    const prompt = `Translate the following text into ${targetLanguage}. 
IMPORTANT: 
1. If the input contains timing information or index numbers (like in .srt or .vtt), keep them EXACTLY as they are.
2. Only translate the actual spoken text or sentences.
3. Maintain all formatting tags (like <i>, <b>), new lines, and special characters.
4. Do not include any intro, outro, or explanations. Return ONLY the translated content in the same format.

Input:
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }
}
