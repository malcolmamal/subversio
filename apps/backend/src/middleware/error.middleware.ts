import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorMiddleware = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[Error] ${req.method} ${req.url}: ${message}`, {
    stack: err.stack,
    status,
  });

  res.status(status).json({
    error: message,
    status,
  });
};
