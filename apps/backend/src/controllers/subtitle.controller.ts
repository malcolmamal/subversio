import { Request, Response } from 'express';
import { SubtitleRepository } from '../repositories/subtitle.repository';
import { StorageRepository } from '../repositories/storage.repository';
import { TranslationService } from '../services/translation.service';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseSync, stringifySync, Node } from 'subtitle';
import { logger } from '../utils/logger';

export class SubtitleController {
  constructor(
    private subtitleRepo: SubtitleRepository,
    private storageRepo: StorageRepository,
    private translationService: TranslationService,
  ) {}

  private getSubtitleFormat(subtitle: any): string | null {
    const ext = path.extname(subtitle?.originalFileName || subtitle?.originalFilePath || '').toLowerCase();
    if (!ext) return null;
    return ext.replace('.', '');
  }

  private ensureSupportedFormat(format: string | null): format is 'srt' | 'vtt' {
    return format === 'srt' || format === 'vtt';
  }

  private parseNodes(content: string): { cues: Node[]; nonCues: Node[] } {
    const nodes = parseSync(content);
    return {
      cues: nodes.filter((n) => n.type === 'cue'),
      nonCues: nodes.filter((n) => n.type !== 'cue'),
    };
  }

  private async readCuesFromFile(filePath: string): Promise<{ cues: Node[]; nonCues: Node[] }> {
    const content = await this.storageRepo.readFile(filePath);
    return this.parseNodes(content);
  }

  private async saveCuesToFile(filePath: string, cues: Node[], nonCues: Node[], format: 'srt' | 'vtt'): Promise<void> {
    const content = stringifySync([...nonCues, ...cues], { format: format.toUpperCase() as any });
    await this.storageRepo.saveFile(filePath, content);
  }

  private buildEmptyTranslatedCues(originalCues: Node[]): Node[] {
    return originalCues.map((cue) => {
      const data = (cue as any).data || {};
      return {
        ...cue,
        data: { ...data, text: '' },
      } as Node;
    });
  }

  private alignTranslatedCues(translatedCues: Node[], originalCues: Node[]): Node[] {
    if (translatedCues.length >= originalCues.length) return translatedCues;
    const missing = originalCues.slice(translatedCues.length);
    return [...translatedCues, ...this.buildEmptyTranslatedCues(missing)];
  }

  private async ensureTranslatedFile(
    subtitle: any,
    originalCues: Node[],
    originalNonCues: Node[],
    format: 'srt' | 'vtt',
  ): Promise<{ translatedCues: Node[]; translatedNonCues: Node[]; translatedFilePath: string }> {
    if (subtitle.translatedFilePath) {
      const { cues, nonCues } = await this.readCuesFromFile(subtitle.translatedFilePath);
      return { translatedCues: cues, translatedNonCues: nonCues, translatedFilePath: subtitle.translatedFilePath };
    }

    const ext = path.extname(subtitle.originalFileName || subtitle.originalFilePath || '') || `.${format}`;
    const targetLanguage = subtitle.targetLanguage || 'translated';
    const translatedFilePath = `${uuidv4()}_${targetLanguage}${ext}`;
    const translatedCues = this.buildEmptyTranslatedCues(originalCues);
    const translatedNonCues = [...originalNonCues];

    await this.saveCuesToFile(translatedFilePath, translatedCues, translatedNonCues, format);
    await this.subtitleRepo.update(subtitle.id, { translatedFilePath });

    return { translatedCues, translatedNonCues, translatedFilePath };
  }

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

  async updateSegment(req: Request, res: Response) {
    const { id, index } = req.params;
    const { originalText, translatedText } = req.body || {};

    if (originalText == null && translatedText == null) {
      return res.status(400).json({ error: 'originalText or translatedText is required' });
    }

    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const format = this.getSubtitleFormat(subtitle);
    if (!this.ensureSupportedFormat(format)) {
      return res.status(400).json({ error: 'Only SRT/VTT subtitles can be edited' });
    }

    const cueIndex = Number(index) - 1;
    if (!Number.isInteger(cueIndex) || cueIndex < 0) {
      return res.status(400).json({ error: 'Invalid segment index' });
    }

    const { cues: originalCues, nonCues: originalNonCues } = await this.readCuesFromFile(subtitle.originalFilePath);
    if (cueIndex >= originalCues.length) {
      return res.status(400).json({ error: 'Segment index out of range' });
    }

    if (originalText != null) {
      (originalCues[cueIndex] as any).data.text = originalText;
      await this.saveCuesToFile(subtitle.originalFilePath, originalCues, originalNonCues, format);
    }

    let updatedTranslatedText: string | undefined;
    if (translatedText != null) {
      const translatedData = await this.ensureTranslatedFile(subtitle, originalCues, originalNonCues, format);
      const alignedCues = this.alignTranslatedCues(translatedData.translatedCues, originalCues);
      (alignedCues[cueIndex] as any).data.text = translatedText;
      await this.saveCuesToFile(
        translatedData.translatedFilePath,
        alignedCues,
        translatedData.translatedNonCues,
        format,
      );
      updatedTranslatedText = translatedText;
    }

    return res.json({
      index: cueIndex + 1,
      originalText: (originalCues[cueIndex] as any).data.text,
      translatedText: updatedTranslatedText,
    });
  }

  async insertSegment(req: Request, res: Response) {
    const { id } = req.params;
    const { index, originalText, translatedText, startTime, endTime } = req.body || {};

    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const format = this.getSubtitleFormat(subtitle);
    if (!this.ensureSupportedFormat(format)) {
      return res.status(400).json({ error: 'Only SRT/VTT subtitles can be edited' });
    }

    const insertAt = Number(index);
    if (!Number.isInteger(insertAt) || insertAt < 1) {
      return res.status(400).json({ error: 'Invalid insert index' });
    }

    const { cues: originalCues, nonCues: originalNonCues } = await this.readCuesFromFile(subtitle.originalFilePath);
    if (insertAt > originalCues.length + 1) {
      return res.status(400).json({ error: 'Insert index out of range' });
    }

    const originalCuesBeforeInsert = [...originalCues];
    const prevCue = originalCues[insertAt - 2];
    const nextCue = originalCues[insertAt - 1];
    const prevEnd = prevCue ? (prevCue as any).data.end : 0;
    const nextStart = nextCue ? (nextCue as any).data.start : prevEnd + 1000;

    const start = Number.isFinite(Number(startTime)) ? Number(startTime) : prevEnd;
    let end = Number.isFinite(Number(endTime)) ? Number(endTime) : nextCue ? nextStart : start + 1000;
    if (end <= start) end = start + 1000;

    const newCue: Node = {
      type: 'cue',
      data: { start, end, text: originalText || '' },
    } as Node;

    originalCues.splice(insertAt - 1, 0, newCue);
    await this.saveCuesToFile(subtitle.originalFilePath, originalCues, originalNonCues, format);

    if (subtitle.translatedFilePath || translatedText != null) {
      const translatedData = await this.ensureTranslatedFile(
        subtitle,
        originalCuesBeforeInsert,
        originalNonCues,
        format,
      );
      const alignedCues = this.alignTranslatedCues(translatedData.translatedCues, originalCuesBeforeInsert);
      const translatedCue: Node = {
        type: 'cue',
        data: { start, end, text: translatedText || '' },
      } as Node;
      alignedCues.splice(insertAt - 1, 0, translatedCue);
      await this.saveCuesToFile(
        translatedData.translatedFilePath,
        alignedCues,
        translatedData.translatedNonCues,
        format,
      );
    }

    return res.json({ index: insertAt });
  }

  async deleteSegment(req: Request, res: Response) {
    const { id, index } = req.params;

    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const format = this.getSubtitleFormat(subtitle);
    if (!this.ensureSupportedFormat(format)) {
      return res.status(400).json({ error: 'Only SRT/VTT subtitles can be edited' });
    }

    const removeAt = Number(index);
    if (!Number.isInteger(removeAt) || removeAt < 1) {
      return res.status(400).json({ error: 'Invalid segment index' });
    }

    const { cues: originalCues, nonCues: originalNonCues } = await this.readCuesFromFile(subtitle.originalFilePath);
    if (removeAt > originalCues.length) {
      return res.status(400).json({ error: 'Segment index out of range' });
    }

    const originalCuesBeforeDelete = [...originalCues];
    originalCues.splice(removeAt - 1, 1);
    await this.saveCuesToFile(subtitle.originalFilePath, originalCues, originalNonCues, format);

    if (subtitle.translatedFilePath) {
      const translatedData = await this.readCuesFromFile(subtitle.translatedFilePath);
      const alignedCues = this.alignTranslatedCues(translatedData.cues, originalCuesBeforeDelete);
      if (removeAt <= alignedCues.length) {
        alignedCues.splice(removeAt - 1, 1);
        await this.saveCuesToFile(subtitle.translatedFilePath, alignedCues, translatedData.nonCues, format);
      }
    }

    return res.json({ index: removeAt });
  }

  async translateSegment(req: Request, res: Response) {
    const { id, index } = req.params;
    const { targetLanguage } = req.body || {};

    const subtitle = await this.subtitleRepo.findById(id);
    if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

    const format = this.getSubtitleFormat(subtitle);
    if (!this.ensureSupportedFormat(format)) {
      return res.status(400).json({ error: 'Only SRT/VTT subtitles can be edited' });
    }

    const cueIndex = Number(index) - 1;
    if (!Number.isInteger(cueIndex) || cueIndex < 0) {
      return res.status(400).json({ error: 'Invalid segment index' });
    }

    const { cues: originalCues, nonCues: originalNonCues } = await this.readCuesFromFile(subtitle.originalFilePath);
    if (cueIndex >= originalCues.length) {
      return res.status(400).json({ error: 'Segment index out of range' });
    }

    const textToTranslate = (originalCues[cueIndex] as any).data.text || '';
    const language = targetLanguage || subtitle.targetLanguage || 'English';
    const translatedText = await this.translationService.translateSegmentText(textToTranslate, language);

    const translatedData = await this.ensureTranslatedFile(subtitle, originalCues, originalNonCues, format);
    const alignedCues = this.alignTranslatedCues(translatedData.translatedCues, originalCues);
    (alignedCues[cueIndex] as any).data.text = translatedText;
    await this.saveCuesToFile(translatedData.translatedFilePath, alignedCues, translatedData.translatedNonCues, format);

    return res.json({ index: cueIndex + 1, translatedText });
  }

  async getAll(req: Request, res: Response) {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [subtitles, total] = await this.subtitleRepo.findAll(skip, Number(limit));
    res.json({ subtitles, total, page: Number(page), limit: Number(limit) });
  }

  async upload(req: Request, res: Response) {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, sourceLanguage } = req.body;
    const subtitle = await this.subtitleRepo.create({
      name: name || file.originalname,
      originalFileName: file.originalname,
      originalFilePath: file.filename,
      sourceLanguage: sourceLanguage || 'und',
      status: 'UPLOADED',
    });

    res.json(subtitle);
  }

  async translate(req: Request, res: Response) {
    const { id } = req.params;
    const { targetLanguage, chunkSize } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' });
    }

    logger.info(`Starting translation for ${id} to ${targetLanguage} with chunkSize ${chunkSize || 'default'}`);
    this.translationService.translateSubtitle(id, targetLanguage, { chunkSize }).catch((err) => {
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
