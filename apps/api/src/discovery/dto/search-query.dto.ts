import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import type { SearchEntityType } from '../providers/music-provider.interface';

export class SearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @IsIn(['track', 'album', 'artist'])
  type?: SearchEntityType;
}
