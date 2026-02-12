import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { ContentProcessor } from './content.processor';
import { ContentService } from './content.service';
import { Content } from './entities/content.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content]),
    BullModule.registerQueue({
      name: 'content',
      defaultJobOptions: {
        removeOnComplete: true, 
      }
    }),
  ],
  controllers: [ContentController],
  providers: [ContentService, ContentProcessor],
  exports: [ContentService],
})
export class ContentModule {}
