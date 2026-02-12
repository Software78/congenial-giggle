import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '../entities/content.entity';

export class ContentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  creatorId: string;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
