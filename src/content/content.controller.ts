import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { ContentResponseDto } from './dto/content-response.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  async create(@Body() createContentDto: CreateContentDto) {
    const content = await this.contentService.create(createContentDto);
    return this.toResponse(content);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const content = await this.contentService.findById(id);
    return this.toResponse(content);
  }

  private toResponse(content: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    creatorId: string;
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
