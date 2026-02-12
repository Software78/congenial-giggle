import { ContentStatus } from '../entities/content.entity';

export class ContentResponseDto {
  id: string;
  title: string;
  description: string;
  tags: string[];
  creatorId: string;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}
