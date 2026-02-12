import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Content } from './entities/content.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentProcessor } from './content.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content]),
    BullModule.registerQueue({
      name: 'content',
    }),
  ],
  controllers: [ContentController],
  providers: [ContentService, ContentProcessor],
  exports: [ContentService],
})
export class ContentModule {}
