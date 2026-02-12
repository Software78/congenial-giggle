import { IsString, MinLength } from 'class-validator';

export class AssistRequestDto {
  @IsString()
  @MinLength(1)
  query: string;
}
