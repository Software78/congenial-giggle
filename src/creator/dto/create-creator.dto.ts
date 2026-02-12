import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCreatorDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;
}
