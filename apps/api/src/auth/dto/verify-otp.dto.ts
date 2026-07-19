import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}
