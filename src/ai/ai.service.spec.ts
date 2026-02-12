import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { ContentService } from '../content/content.service';
import { SearchService } from '../search/search.service';

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

  beforeEach(async () => {
    mockGenerateContent.mockReset();

    const mockContentService = {
      findById: jest.fn(),
    };

    const mockSearchService = {
      search: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
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
        text: '{"summary":"A great article about AI","contentId":"abc-123"}',
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Summarize content abc-123');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash',
          config: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        }),
      );
      expect(result).toEqual({
        summary: 'A great article about AI',
        contentId: 'abc-123',
      });
    });

    it('should return response wrapper when JSON parse fails', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Plain text response',
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Hello');

      expect(result).toEqual({ response: 'Plain text response' });
    });

    it('should return default when no text generated', async () => {
      mockGenerateContent.mockResolvedValue({
        text: undefined,
        functionCalls: undefined,
        candidates: [],
      });

      const result = await service.assist('Empty query');

      expect(result).toEqual({ response: 'No response generated' });
    });

    it('should call ContentService.findById when model requests get_content_by_id', async () => {
      const mockContent = {
        id: 'content-1',
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
              args: { content_id: 'content-1' },
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

      const result = await service.assist('Summarize content content-1');

      expect(contentService.findById).toHaveBeenCalledWith('content-1');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ summary: 'Test content' });
    });

    it('should call SearchService.search when model requests search_content', async () => {
      const mockSearchResults = [
        {
          id: 'c1',
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
      expect(result).toEqual({ results: [], message: 'Found 1 result' });
    });
  });
});
