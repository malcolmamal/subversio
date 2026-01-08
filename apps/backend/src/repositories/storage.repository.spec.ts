import { DiskStorageRepository } from './storage.repository';
import fs from 'fs';

jest.mock('fs');
jest.mock('../utils/logger');

describe('DiskStorageRepository', () => {
  let repository: DiskStorageRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    repository = new DiskStorageRepository();
  });

  it('should save file', async () => {
    await repository.saveFile('test.txt', 'hello');
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('test.txt'), 'hello');
  });

  it('should read file', async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('content');
    const result = await repository.readFile('test.txt');
    expect(result).toBe('content');
  });

  it('should throw error if reading non-existent file', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(repository.readFile('missing.txt')).rejects.toThrow('File not found');
  });

  it('should delete file if exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    await repository.deleteFile('test.txt');
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('should check if file exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    expect(await repository.fileExists('test.txt')).toBe(true);
  });
});
