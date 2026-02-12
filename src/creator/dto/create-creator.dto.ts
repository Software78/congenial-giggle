import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCreatorDto {
  @ApiProperty({ example: 'Alice' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;
}
