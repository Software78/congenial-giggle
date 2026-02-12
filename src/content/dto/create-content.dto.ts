import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ example: 'My Post' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'A great article about technology.' })
  @IsString()
  description: string;

  @ApiProperty({ example: ['tech', 'ai'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  creatorId: string;
}
