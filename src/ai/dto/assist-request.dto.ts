import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AssistRequestDto {
  @ApiProperty({ example: 'Summarize the content with id abc-123' })
  @IsString()
  @MinLength(1)
  query: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional idempotency key from a previous response; when provided and cached, the cached result is returned without calling the AI again.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;
}
