import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { AssistRequestDto } from './dto/assist-request.dto';

@ApiTags('ai')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('assist')
  @ApiOperation({ summary: 'AI assistant with tool calling (summarize, search)' })
  assist(@Body() dto: AssistRequestDto) {
    return this.aiService.assist(dto.query);
  }
}
