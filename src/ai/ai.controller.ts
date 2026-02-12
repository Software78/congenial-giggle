import { Controller, Post, Body } from '@nestjs/common';
import { AIService } from './ai.service';
import { AssistRequestDto } from './dto/assist-request.dto';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('assist')
  assist(@Body() dto: AssistRequestDto) {
    return this.aiService.assist(dto.query);
  }
}
