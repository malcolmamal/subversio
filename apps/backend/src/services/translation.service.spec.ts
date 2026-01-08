import { TranslationService } from './translation.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('TranslationService', () => {
  let service: TranslationService;
  let mockRepo: any;
  let mockStorageRepo: any;
  let mockProcessRegistry: any;
  let mockGenAI: any;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      findByStatus: jest.fn(),
    };

    mockStorageRepo = {
      saveFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('1\n00:00:01,000 --> 00:00:02,000\nHello'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
    };

    mockProcessRegistry = {
      registerTask: jest.fn(),
      deregisterTask: jest.fn(),
      isTaskActive: jest.fn().mockReturnValue(false),
    };

    mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => '1\n00:00:01,000 --> 00:00:02,000\nMocked translation' },
        }),
      }),
    };

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => mockGenAI);

    service = new TranslationService(mockRepo as any, mockStorageRepo as any, mockProcessRegistry as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translateSubtitle', () => {
    it('should throw error if subtitle not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.translateSubtitle('1', 'English')).rejects.toThrow('Subtitle not found');
    });

    it('should translate successfully', async () => {
      const mockSubtitle = {
        id: '1',
        name: 'test.srt',
        originalFileName: 'test.srt',
        originalFilePath: 'original.srt',
        status: 'UPLOADED',
      };

      mockRepo.findById.mockResolvedValue(mockSubtitle);

      await service.translateSubtitle('1', 'Spanish');

      expect(mockRepo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: 'TRANSLATING',
          targetLanguage: 'Spanish',
        }),
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: 'COMPLETED',
        }),
      );

      expect(mockStorageRepo.saveFile).toHaveBeenCalled();
    });
  });
});
