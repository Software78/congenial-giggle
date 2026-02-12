import { Processor, Process } from '@nestjs/bull';
import * as Bull from 'bull';
import { ContentService } from './content.service';
import { ContentStatus } from './entities/content.entity';

export interface ProcessContentJob {
  contentId: string;
}

@Processor('content')
export class ContentProcessor {
  constructor(private readonly contentService: ContentService) {}

  @Process('process-content')
  async handleProcessContent(job: Bull.Job<ProcessContentJob>) {
    const { contentId } = job.data;

    // Validate, optionally compute search vector, and publish
    await this.contentService.updateStatus(contentId, ContentStatus.PUBLISHED);

    // Invalidate feed cache so new content appears
    await this.contentService.invalidateFeedCache();
  }
}
