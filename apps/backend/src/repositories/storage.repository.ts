import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface StorageRepository {
  saveFile(filename: string, content: string | Buffer): Promise<void>;
  readFile(filename: string): Promise<string>;
  deleteFile(filename: string): Promise<void>;
  fileExists(filename: string): Promise<boolean>;
}

export class DiskStorageRepository implements StorageRepository {
  private uploadsDir = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      logger.info(`Creating uploads directory at ${this.uploadsDir}`);
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveFile(filename: string, content: string | Buffer): Promise<void> {
    const filePath = path.join(this.uploadsDir, filename);
    fs.writeFileSync(filePath, content);
  }

  async readFile(filename: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.uploadsDir, filename);
    return fs.existsSync(filePath);
  }
}
