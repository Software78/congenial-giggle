import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import * as CacheManager from 'cache-manager';
import { createHash } from 'crypto';
import { Content, ContentStatus } from '../content/entities/content.entity';

const SEARCH_CACHE_TTL = 60; // 1 minute
const DEFAULT_LIMIT = 20;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager.Cache,
  ) {}

  async search(
    query?: string,
    tags?: string[],
    limit: number = DEFAULT_LIMIT,
    offset: number = 0,
  ): Promise<Content[]> {
    const cacheKey = this.getCacheKey(query, tags, offset);
    const cached = await this.cacheManager.get<Content[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.creator', 'creator')
      .where('content.status = :status', { status: ContentStatus.PUBLISHED });

    if (query && query.trim()) {
      // PostgreSQL full-text search
      qb.andWhere(
        `(to_tsvector('english', content.title || ' ' || content.description) @@ plainto_tsquery('english', :query))`,
        { query: query.trim() },
      );
    }

    if (tags && tags.length > 0) {
      qb.andWhere('content.tags && :tags', { tags });
    }

    const items = await qb
      .orderBy('content.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();

    await this.cacheManager.set(cacheKey, items, SEARCH_CACHE_TTL * 1000);

    return items;
  }

  private getCacheKey(query?: string, tags?: string[], offset?: number): string {
    const data = JSON.stringify({ q: query, tags, offset });
    const hash = createHash('md5').update(data).digest('hex');
    return `search:${hash}`;
  }
}
