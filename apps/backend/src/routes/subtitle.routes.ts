import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SubtitleController } from '../controllers/subtitle.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const uploadsDir = path.join(__dirname, '../../uploads');

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

export function createSubtitleRouter(controller: SubtitleController) {
  router.get(
    '/',
    asyncHandler((req: any, res: any) => controller.getAll(req, res)),
  );
  router.get(
    '/:id/compare',
    asyncHandler((req: any, res: any) => controller.getCompare(req, res)),
  );
  router.get('/events', (req, res) => controller.events(req, res)); // SSE stays standard usually
  router.post(
    '/upload',
    upload.single('file'),
    asyncHandler((req: any, res: any) => controller.upload(req, res)),
  );
  router.get(
    '/:id',
    asyncHandler((req: any, res: any) => controller.getOne(req, res)),
  );
  router.post(
    '/:id/translate',
    asyncHandler((req: any, res: any) => controller.translate(req, res)),
  );
  router.post(
    '/:id/restart',
    asyncHandler((req: any, res: any) => controller.restart(req, res)),
  );
  router.patch(
    '/:id',
    asyncHandler((req: any, res: any) => controller.rename(req, res)),
  );
  router.delete(
    '/:id',
    asyncHandler((req: any, res: any) => controller.delete(req, res)),
  );

  return router;
}
