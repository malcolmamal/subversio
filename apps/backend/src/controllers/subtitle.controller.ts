import { Request, Response } from 'express';
import { SubtitleRepository } from '../repositories/subtitle.repository';
import { StorageRepository } from '../repositories/storage.repository';
import { TranslationService } from '../services/translation.service';
import { parseSync } from 'subtitle';
import { logger } from '../utils/logger';

export class SubtitleController {
  constructor(
    private subtitleRepo: SubtitleRepository,
    private storageRepo: StorageRepository,
    private translationService: TranslationService,
  ) {}

  async getCompare(req: Request, res: Response) {
    const { id } = req.params;
    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const originalContent = await this.storageRepo.readFile(subtitle.originalFilePath);
    const originalNodes = parseSync(originalContent).filter((n) => n.type === 'cue');

    let translatedNodes: any[] = [];
    if (subtitle.translatedFilePath) {
      try {
        const translatedContent = await this.storageRepo.readFile(subtitle.translatedFilePath);
        translatedNodes = parseSync(translatedContent).filter((n) => n.type === 'cue');
      } catch (err) {
        logger.error(`Error reading translated file ${subtitle.translatedFilePath}:`, err);
      }
    }

    const segments = originalNodes.map((org, i) => {
      const trans = translatedNodes[i];
      return {
        index: i + 1,
        startTime: (org.data as any).start,
        endTime: (org.data as any).end,
        originalText: (org.data as any).text,
        translatedText: trans ? (trans.data as any).text : undefined,
      };
    });

    res.json({ subtitle, segments });
  }

  async getAll(req: Request, res: Response) {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [subtitles, total] = await this.subtitleRepo.findAll(skip, Number(limit));
    res.json({ subtitles, total, page: Number(page), limit: Number(limit) });
  }

  async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, sourceLanguage } = req.body;
    const subtitle = await this.subtitleRepo.create({
      name: name || req.file.originalname,
      originalFileName: req.file.originalname,
      originalFilePath: req.file.filename,
      sourceLanguage: sourceLanguage || 'und',
      status: 'UPLOADED',
    });

    res.json(subtitle);
  }

  async translate(req: Request, res: Response) {
    const { id } = req.params;
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' });
    }

    logger.info(`Starting translation for ${id} to ${targetLanguage}`);
    this.translationService.translateSubtitle(id, targetLanguage).catch((err) => {
      logger.error(`Background translation error for ${id}:`, err);
    });

    res.json({ message: 'Translation started' });
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const filesToDelete = [subtitle.originalFilePath, subtitle.translatedFilePath].filter(Boolean) as string[];
    for (const fileName of filesToDelete) {
      try {
        await this.storageRepo.deleteFile(fileName);
      } catch (err) {
        logger.error(`Error deleting file ${fileName}:`, err);
      }
    }

    await this.subtitleRepo.delete(id);
    res.json({ message: 'Subtitle deleted' });
  }

  async rename(req: Request, res: Response) {
    const { id } = req.params;
    const { name } = req.body;
    const subtitle = await this.subtitleRepo.update(id, { name });
    res.json(subtitle);
  }

  async restart(req: Request, res: Response) {
    const { id } = req.params;
    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const targetLanguage = subtitle.targetLanguage || 'English';
    await this.subtitleRepo.update(id, {
      status: 'TRANSLATING',
      progress: 0,
    });

    this.translationService.translateSubtitle(id, targetLanguage).catch((err) => {
      logger.error(`Background translation restart error for ${id}:`, err);
    });

    res.json({ message: 'Translation restarted' });
  }

  async getOne(req: Request, res: Response) {
    const { id } = req.params;
    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Not found' });
    res.json(subtitle);
  }

  // SSE Implementation
  async events(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onProgress = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    this.translationService.on('progress', onProgress);

    req.on('close', () => {
      this.translationService.off('progress', onProgress);
    });
  }
}
