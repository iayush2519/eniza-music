import { IsEmail, MaxLength } from 'class-validator';

export class ResendOtpDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
