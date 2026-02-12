import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { Content, ContentStatus } from '../content/entities/content.entity';

describe('SearchService', () => {
  let service: SearchService;
  let contentRepository: jest.Mocked<Partial<Repository<Content>>>;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  const mockItems: Content[] = [
    {
      id: 'content-1',
      title: 'AI Post',
      description: 'About machine learning',
      tags: ['tech', 'ai'],
      creatorId: 'creator-1',
      status: ContentStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Content,
  ];

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockItems),
  };

  beforeEach(async () => {
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Content),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    contentRepository = module.get(getRepositoryToken(Content));
    cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return cached results when available', async () => {
      const cached = [...mockItems];
      (cacheManager.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.search('ai', undefined, 20, 0);

      expect(result).toEqual(cached);
      expect(contentRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should search with query and cache results', async () => {
      const result = await service.search('machine', undefined, 20, 0);

      expect(contentRepository.createQueryBuilder).toHaveBeenCalledWith('content');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('to_tsvector'),
        { query: 'machine' },
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });

    it('should filter by tags when provided', async () => {
      await service.search('ai', ['tech'], 20, 0);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'content.tags && :tags',
        { tags: ['tech'] },
      );
    });

    it('should use default limit when not specified', async () => {
      await service.search();

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });
});
