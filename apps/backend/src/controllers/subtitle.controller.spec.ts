import { SubtitleController } from './subtitle.controller';

describe('SubtitleController', () => {
  let controller: SubtitleController;
  let mockRepo: any;
  let mockStorage: any;
  let mockTranslation: any;
  let mockRes: any;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockStorage = {
      readFile: jest.fn(),
      saveFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    mockTranslation = {
      translateSubtitle: jest.fn().mockResolvedValue(undefined),
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    controller = new SubtitleController(mockRepo, mockStorage, mockTranslation);
  });

  describe('getAll', () => {
    it('should return paginated subtitles', async () => {
      const mockSubtitles = [{ id: '1', name: 'test' }];
      mockRepo.findAll.mockResolvedValue([mockSubtitles, 1]);

      const req = { query: { page: '1', limit: '10' } } as any;
      await controller.getAll(req, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          subtitles: mockSubtitles,
          total: 1,
        }),
      );
    });
  });

  describe('upload', () => {
    it('should return 400 if no file', async () => {
      const req = { file: null } as any;
      await controller.upload(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create subtitle on success', async () => {
      const req = {
        file: { originalname: 'test.srt', filename: 'uuid-test.srt' },
        body: { name: 'Custom Name', sourceLanguage: 'en' },
      } as any;
      mockRepo.create.mockResolvedValue({ id: '1' });

      await controller.upload(req, mockRes);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Name',
          originalFileName: 'test.srt',
        }),
      );
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getCompare', () => {
    it('should return 404 if subtitle not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await controller.getCompare({ params: { id: '1' } } as any, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return mapped segments', async () => {
      const mockSubtitle = { id: '1', originalFilePath: 'org.srt', translatedFilePath: 'trans.srt' };
      mockRepo.findById.mockResolvedValue(mockSubtitle);
      mockStorage.readFile.mockResolvedValueOnce('1\n00:00:01,000 --> 00:00:02,000\nHello');
      mockStorage.readFile.mockResolvedValueOnce('1\n00:00:01,000 --> 00:00:02,000\nHola');

      await controller.getCompare({ params: { id: '1' } } as any, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          segments: expect.arrayContaining([
            expect.objectContaining({ originalText: 'Hello', translatedText: 'Hola' }),
          ]),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete file and record', async () => {
      const mockSubtitle = { id: '1', originalFilePath: '1.srt', translatedFilePath: '2.srt' };
      mockRepo.findById.mockResolvedValue(mockSubtitle);

      await controller.delete({ params: { id: '1' } } as any, mockRes);

      expect(mockStorage.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });
  });
});
