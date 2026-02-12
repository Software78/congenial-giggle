import { Controller, Post, Get, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { ContentResponseDto } from './dto/content-response.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Publish content (enqueues async job)' })
  async create(@Body() createContentDto: CreateContentDto) {
    const content = await this.contentService.create(createContentDto);
    return this.toResponse(content);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const content = await this.contentService.findById(id);
    return this.toResponse(content);
  }

  private toResponse(content: {
    id: number;
    title: string;
    description: string;
    tags: string[];
    creatorId: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ContentResponseDto {
    return {
      id: content.id,
      title: content.title,
      description: content.description,
      tags: content.tags,
      creatorId: content.creatorId,
      status: content.status as ContentResponseDto['status'],
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }
}
