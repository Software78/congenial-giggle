import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { FeedService } from './feed.service';
import { Content, ContentStatus } from '../content/entities/content.entity';

describe('FeedService', () => {
  let service: FeedService;
  let contentRepository: jest.Mocked<Repository<Content>>;
  let cacheManager: { get: jest.Mock; set: jest.Mock };

  const mockItems: Content[] = [
    {
      id: 1,
      title: 'Post 1',
      description: 'Desc 1',
      tags: ['tech'],
      creatorId: 1,
      status: ContentStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Content,
  ];

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn().mockResolvedValue(mockItems),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
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

    service = module.get<FeedService>(FeedService);
    contentRepository = module.get(getRepositoryToken(Content));
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should return cached feed when available', async () => {
      const cached = [...mockItems];
      (cacheManager.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.getFeed(20, 0);

      expect(cacheManager.get).toHaveBeenCalledWith('feed:0');
      expect(result).toEqual(cached);
      expect(contentRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch from DB, cache, and return when not cached', async () => {
      const result = await service.getFeed(20, 0);

      expect(contentRepository.find).toHaveBeenCalledWith({
        where: { status: ContentStatus.PUBLISHED },
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
        relations: ['creator'],
      });
      expect(cacheManager.set).toHaveBeenCalledWith('feed:0', mockItems, 120000);
      expect(result).toEqual(mockItems);
    });

    it('should use correct cache key for pagination', async () => {
      await service.getFeed(20, 40);

      expect(cacheManager.get).toHaveBeenCalledWith('feed:2');
      expect(contentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        }),
      );
    });
  });
});
