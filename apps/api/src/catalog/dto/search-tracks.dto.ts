import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchTracksDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string;
}
