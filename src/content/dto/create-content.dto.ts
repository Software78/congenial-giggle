import { IsArray, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsUUID()
  creatorId: string;
}
