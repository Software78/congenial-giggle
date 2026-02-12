import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatorService } from './creator.service';
import { CreateCreatorDto } from './dto/create-creator.dto';

@ApiTags('creators')
@Controller('creators')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a creator' })
  create(@Body() createCreatorDto: CreateCreatorDto) {
    return this.creatorService.create(createCreatorDto);
  }
}
