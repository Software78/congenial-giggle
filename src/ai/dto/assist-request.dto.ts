import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssistRequestDto {
  @ApiProperty({ example: 'Summarize the content with id abc-123' })
  @IsString()
  @MinLength(1)
  query: string;
}
