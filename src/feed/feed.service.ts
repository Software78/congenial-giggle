import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import * as CacheManager from 'cache-manager';
import { Content, ContentStatus } from '../content/entities/content.entity';

const FEED_CACHE_TTL = 120; // 2 minutes
const DEFAULT_LIMIT = 20;

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager.Cache,
  ) {}

  async getFeed(limit: number = DEFAULT_LIMIT, offset: number = 0) {
    const page = Math.floor(offset / limit);
    const cacheKey = `feed:${page}`;

    const cached = await this.cacheManager.get<Content[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.contentRepository.find({
      where: { status: ContentStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['creator'],
    });

    await this.cacheManager.set(
      cacheKey,
      items,
      FEED_CACHE_TTL * 1000,
    );

    return items;
  }
}
