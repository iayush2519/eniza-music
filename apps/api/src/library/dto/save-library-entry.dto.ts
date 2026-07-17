import { IsIn, IsUUID } from 'class-validator';

export class SaveLibraryEntryDto {
  @IsIn(['track', 'album', 'artist'])
  entityType!: 'track' | 'album' | 'artist';

  @IsUUID()
  entityId!: string;
}
