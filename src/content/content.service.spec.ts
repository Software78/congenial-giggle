import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { ContentService } from './content.service';
import { Content, ContentStatus } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';

describe('ContentService', () => {
  let service: ContentService;
  let contentRepository: jest.Mocked<Repository<Content>>;
  let contentQueue: { add: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockContent: Content = {
    id: 'content-uuid-1',
    title: 'Test Post',
    description: 'A test description',
    tags: ['tech', 'ai'],
    creatorId: 'creator-uuid-1',
    status: ContentStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Content;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...mockContent, ...dto })),
      save: jest.fn().mockResolvedValue(mockContent),
      findOne: jest.fn().mockResolvedValue(mockContent),
    };

    const mockQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: getRepositoryToken(Content),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken('content'),
          useValue: mockQueue,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    contentRepository = module.get(getRepositoryToken(Content));
    contentQueue = module.get(getQueueToken('content'));
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create content as draft and enqueue job', async () => {
      const dto: CreateContentDto = {
        title: 'Test Post',
        description: 'A test',
        tags: ['tech'],
        creatorId: 'creator-uuid-1',
      };

      const result = await service.create(dto);

      expect(contentRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: ContentStatus.DRAFT,
      });
      expect(contentRepository.save).toHaveBeenCalled();
      expect(contentQueue.add).toHaveBeenCalledWith('process-content', {
        contentId: mockContent.id,
      });
      expect(result.status).toBe(ContentStatus.DRAFT);
    });
  });

  describe('findById', () => {
    it('should return cached content when available', async () => {
      const cached = { ...mockContent };
      (cacheManager.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.findById('content-uuid-1');

      expect(cacheManager.get).toHaveBeenCalledWith('content:content-uuid-1');
      expect(result).toEqual(cached);
      expect(contentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when not cached', async () => {
      const result = await service.findById('content-uuid-1');

      expect(contentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'content-uuid-1' },
        relations: ['creator'],
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'content:content-uuid-1',
        mockContent,
        300000,
      );
      expect(result).toEqual(mockContent);
    });

    it('should throw NotFoundException when content not found', async () => {
      (contentRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Content with id non-existent not found',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and invalidate cache', async () => {
      const updated = { ...mockContent, status: ContentStatus.PUBLISHED };
      (contentRepository.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStatus('content-uuid-1', ContentStatus.PUBLISHED);

      expect(contentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'content-uuid-1' },
      });
      expect(mockContent.status).toBe(ContentStatus.PUBLISHED);
      expect(cacheManager.del).toHaveBeenCalledWith('content:content-uuid-1');
    });

    it('should throw when content not found', async () => {
      (contentRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', ContentStatus.PUBLISHED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('invalidateFeedCache', () => {
    it('should delete feed cache keys', async () => {
      await service.invalidateFeedCache();

      expect(cacheManager.del).toHaveBeenCalledTimes(100);
      expect(cacheManager.del).toHaveBeenCalledWith('feed:0');
      expect(cacheManager.del).toHaveBeenCalledWith('feed:1');
      expect(cacheManager.del).toHaveBeenCalledWith('feed:99');
    });
  });
});
