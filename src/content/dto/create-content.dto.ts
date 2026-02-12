import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 1 })
  @IsInt()
  creatorId: number;
}
