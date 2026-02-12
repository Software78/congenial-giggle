import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Bull from 'bull';
import * as CacheManager from 'cache-manager';
import { Repository } from 'typeorm';
import { CreateContentDto } from './dto/create-content.dto';
import { Content, ContentStatus } from './entities/content.entity';

const CONTENT_CACHE_TTL = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'content:';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectQueue('content') private readonly contentQueue: Bull.Queue,
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager.Cache,
  ) {}

  async create(createContentDto: CreateContentDto): Promise<Content> {
    const content = this.contentRepository.create({
      ...createContentDto,
      status: ContentStatus.DRAFT,
    });
    const saved = await this.contentRepository.save(content);

    // Enqueue job for async processing (validate, publish)
    await this.contentQueue.add('process-content', { contentId: saved.id });

    return saved;
  }

  async findById(id: number): Promise<Content> {
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    const cached = await this.cacheManager.get<Content>(cacheKey);
    if (cached) {
      return cached;
    }

    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    await this.cacheManager.set(cacheKey, content, CONTENT_CACHE_TTL * 1000);
    return content;
  }

  async updateStatus(id: number, status: ContentStatus): Promise<Content> {
    const content = await this.contentRepository.findOne({ where: { id } });
    if (!content) {
        throw new NotFoundException('Content not found');
    }
    content.status = status;
    const updated = await this.contentRepository.save(content);

    // Invalidate cache
    await this.cacheManager.del(`${CACHE_KEY_PREFIX}${id}`);

    return updated;
  }

  async invalidateFeedCache(): Promise<void> {
    // Invalidate all feed pages (we use pattern - cache-manager may not support)
    // For simplicity we invalidate feed:0, feed:1, etc. up to a reasonable limit
    for (let page = 0; page < 100; page++) {
      await this.cacheManager.del(`feed:${page}`);
    }
  }
}
