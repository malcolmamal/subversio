import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import { logger } from './utils/logger';
import { TranslationService } from './services/translation.service';
import { SubtitleRepository } from './repositories/subtitle.repository';
import { DiskStorageRepository } from './repositories/storage.repository';
import { ProcessRegistry } from './services/process-registry.service';
import { SubtitleController } from './controllers/subtitle.controller';
import { createSubtitleRouter } from './routes/subtitle.routes';
import { errorMiddleware } from './middleware/error.middleware';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Dependency Injection
const subtitleRepo = new SubtitleRepository(prisma);
const storageRepo = new DiskStorageRepository();
const processRegistry = new ProcessRegistry();
const translationService = new TranslationService(subtitleRepo, storageRepo, processRegistry);
const subtitleController = new SubtitleController(subtitleRepo, storageRepo, translationService);
const subtitleRouter = createSubtitleRouter(subtitleController);

const port = 4040;

// Recover stuck translations on startup
translationService.recoverTranslations().catch((err) => {
  logger.error('Failed to recover translations:', err);
});

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

// Static files for downloads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/subtitles', subtitleRouter);

// Error Handling
app.use(errorMiddleware);

app.listen(port, () => {
  logger.info(`Backend listening at http://localhost:${port}`);
});
