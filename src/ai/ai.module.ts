import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ContentModule } from '../content/content.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [ContentModule, SearchModule],
  controllers: [AIController],
  providers: [AIService],
})
export class AIModule {}
