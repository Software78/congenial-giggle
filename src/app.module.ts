import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { CreatorModule } from './creator/creator.module';
import { ContentModule } from './content/content.module';
import { FeedModule } from './feed/feed.module';
import { SearchModule } from './search/search.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/content_platform',
      autoLoadEntities: true,
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl =
          process.env.REDIS_URL ||
          `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
        try {
          const redisStore = new KeyvRedis(redisUrl);
          return {
            stores: [new Keyv({ store: redisStore })],
            ttl: 60 * 1000,
          };
        } catch {
          return {
            stores: [new Keyv()],
            ttl: 60 * 1000,
          };
        }
      },
    }),
    CreatorModule,
    ContentModule,
    FeedModule,
    SearchModule,
    AIModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
