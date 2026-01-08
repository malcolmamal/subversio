import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import { logger } from './utils/logger';
import { TranslationService } from './services/translation.service';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const translationService = new TranslationService();
const port = 4040;

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: 'http://localhost:4041',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Static files for downloads
app.use('/uploads', express.static(uploadsDir));

app.get('/api/subtitles', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [subtitles, total] = await Promise.all([
    prisma.subtitle.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.subtitle.count(),
  ]);

  res.json({ subtitles, total, page: Number(page), limit: Number(limit) });
});

app.post('/api/subtitles/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { name, sourceLanguage } = req.body;

  const subtitle = await prisma.subtitle.create({
    data: {
      name: name || req.file.originalname,
      originalFileName: req.file.originalname,
      originalFilePath: req.file.filename,
      sourceLanguage: sourceLanguage || 'und',
      status: 'UPLOADED',
    },
  });

  res.json(subtitle);
});

app.post('/api/subtitles/:id/translate', async (req, res) => {
  const { id } = req.params;
  const { targetLanguage } = req.body;

  if (!targetLanguage) {
    return res.status(400).json({ error: 'Target language is required' });
  }

  logger.info(`Starting translation for ${id} to ${targetLanguage}`);

  // Start translation in background
  translationService.translateSubtitle(id, targetLanguage).catch((err) => {
    logger.error(`Background translation error for ${id}:`, err);
  });

  res.json({ message: 'Translation started' });
});

app.delete('/api/subtitles/:id', async (req, res) => {
  const { id } = req.params;
  const subtitle = await prisma.subtitle.findUnique({ where: { id } });
  if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

  logger.info(`Deleting subtitle ${id}`);

  // Delete files
  const filesToDelete = [subtitle.originalFilePath, subtitle.translatedFilePath].filter(Boolean) as string[];
  filesToDelete.forEach((file) => {
    const filePath = path.join(uploadsDir, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        logger.error(`Error deleting file ${filePath}:`, err);
      }
    }
  });

  await prisma.subtitle.delete({ where: { id } });
  res.json({ message: 'Subtitle deleted' });
});

app.patch('/api/subtitles/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  logger.info(`Renaming subtitle ${id} to ${name}`);
  const subtitle = await prisma.subtitle.update({
    where: { id },
    data: { name },
  });
  res.json(subtitle);
});

app.post('/api/subtitles/:id/restart', async (req, res) => {
  const { id } = req.params;
  const subtitle = await prisma.subtitle.findUnique({ where: { id } });
  if (!subtitle) return res.status(404).json({ error: 'Subtitle not found' });

  logger.info(`Restarting translation for ${id}`);

  const targetLanguage = subtitle.targetLanguage || 'English'; // Fallback or handle error

  // Reset status and progress
  await prisma.subtitle.update({
    where: { id },
    data: {
      status: 'TRANSLATING',
      progress: 0,
      targetLanguage, // Ensure it's set if we are restarting
    },
  });

  // Restart translation
  translationService.translateSubtitle(id, targetLanguage).catch((err) => {
    logger.error(`Background translation restart error for ${id}:`, err);
  });

  res.json({ message: 'Translation restarted' });
});

app.get('/api/subtitles/:id', async (req, res) => {
  const { id } = req.params;
  const subtitle = await prisma.subtitle.findUnique({ where: { id } });
  if (!subtitle) return res.status(404).json({ error: 'Not found' });
  res.json(subtitle);
});

app.listen(port, () => {
  logger.info(`Backend listening at http://localhost:${port}`);
});
