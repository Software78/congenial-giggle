import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '../entities/content.entity';

export class ContentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  creatorId: number;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
