import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from '../content/content.service';
import { SearchService } from '../search/search.service';
import { AIService } from './ai.service';

// Mock Google GenAI before importing AIService
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe('AIService', () => {
  let service: AIService;
  let contentService: jest.Mocked<ContentService>;
  let searchService: jest.Mocked<SearchService>;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    mockGenerateContent.mockReset();

    const mockContentService = {
      findById: jest.fn(),
    };

    const mockSearchService = {
      search: jest.fn(),
    };

    cacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'gemini.apiKey') return 'test-api-key';
        if (key === 'gemini.assistCacheTtlSeconds') return 600;
        if (key === 'gemini.assistRetryMaxAttempts') return 3;
        if (key === 'gemini.assistRetryInitialDelayMs') return 1000;
        if (key === 'gemini.assistRetryMaxDelayMs') return 10000;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    contentService = module.get(ContentService);
    searchService = module.get(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assist', () => {
    it('should return parsed JSON when model returns valid JSON text', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '{"summary":"A great article about AI","contentId":1}',
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Summarize content abc-123');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          config: expect.objectContaining({
            tools: expect.any(Array),
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          summary: 'A great article about AI',
          contentId: 1,
          requestId: expect.any(String),
        }),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^ai:assist:[0-9a-f-]{36}$/),
        { summary: 'A great article about AI', contentId: 1 },
        600000,
      );
    });

    it('should return response wrapper when JSON parse fails', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Plain text response',
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Hello');

      expect(result).toEqual(
        expect.objectContaining({
          response: 'Plain text response',
          requestId: expect.any(String),
        }),
      );
    });

    it('should return default when no text generated', async () => {
      mockGenerateContent.mockResolvedValue({
        text: undefined,
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Empty query');

      expect(result).toEqual(
        expect.objectContaining({
          response: 'No response generated',
          requestId: expect.any(String),
        }),
      );
    });

    it('should call ContentService.findById when model requests get_content_by_id', async () => {
      const mockContent = {
        id: 1,
        title: 'Test',
        description: 'Desc',
        tags: ['tech'],
        status: 'published',
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          text: undefined,
          functionCalls: [
            {
              name: 'get_content_by_id',
              args: { content_id: 1 },
            },
          ],
          candidates: [
            {
              content: { role: 'model', parts: [] },
            },
          ],
        })
        .mockResolvedValueOnce({
          text: '{"summary":"Test content"}',
          functionCalls: undefined,
          candidates: [],
        });

      (contentService.findById as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.assist('Summarize content 1');

      expect(contentService.findById).toHaveBeenCalledWith(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(
        expect.objectContaining({
          summary: 'Test content',
          requestId: expect.any(String),
        }),
      );
    });

    it('should call SearchService.search when model requests search_content', async () => {
      const mockSearchResults = [
        {
          id: 1,
          title: 'AI Post',
          description: 'About AI',
          tags: ['tech'],
        },
      ];

      mockGenerateContent
        .mockResolvedValueOnce({
          text: undefined,
          functionCalls: [
            {
              name: 'search_content',
              args: { query: 'machine learning', tags: ['tech'] },
            },
          ],
          candidates: [
            {
              content: { role: 'model', parts: [] },
            },
          ],
        })
        .mockResolvedValueOnce({
          text: '{"results":[],"message":"Found 1 result"}',
          functionCalls: undefined,
          candidates: [],
        });

      (searchService.search as jest.Mock).mockResolvedValue(mockSearchResults);

      const result = await service.assist('Find content about machine learning');

      expect(searchService.search).toHaveBeenCalledWith(
        'machine learning',
        ['tech'],
        10,
        0,
      );
      expect(result).toEqual(
        expect.objectContaining({
          results: [],
          message: 'Found 1 result',
          requestId: expect.any(String),
        }),
      );
    });

    it('should return cached result when requestId is provided and cache hits', async () => {
      const cachedBody = { summary: 'Cached summary', contentId: 'xyz' };
      const requestId = '550e8400-e29b-41d4-a716-446655440000';
      cacheManager.get.mockResolvedValue(cachedBody);

      const result = await service.assist('Summarize content xyz', requestId);

      expect(cacheManager.get).toHaveBeenCalledWith(`ai:assist:${requestId}`);
      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual({ ...cachedBody, requestId });
    });

    it('should call AI and cache when requestId is provided but cache misses', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      mockGenerateContent.mockResolvedValue({
        text: '{"summary":"New summary","contentId":1}',
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Summarize content abc', '550e8400-e29b-41d4-a716-446655440000');

      expect(cacheManager.get).toHaveBeenCalledWith('ai:assist:550e8400-e29b-41d4-a716-446655440000');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'ai:assist:550e8400-e29b-41d4-a716-446655440000',
        { summary: 'New summary', contentId: 1 },
        600000,
      );
      expect(result.requestId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should retry on transient error and eventually succeed', async () => {
      const transientError = Object.assign(new Error('Service unavailable'), { status: 503 });
      mockGenerateContent
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({
          text: '{"summary":"After retry","contentId":1}',
          functionCalls: undefined,
          candidates: [],
        });

      const result = await service.assist('Summarize content id');

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(
        expect.objectContaining({
          summary: 'After retry',
          contentId: 1,
          requestId: expect.any(String),
        }),
      );
    });

    it('should not retry on non-transient error (4xx)', async () => {
      const badRequestError = Object.assign(new Error('Bad request'), { status: 400 });
      mockGenerateContent.mockRejectedValue(badRequestError);

      await expect(service.assist('Bad query')).rejects.toThrow('Bad request');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
