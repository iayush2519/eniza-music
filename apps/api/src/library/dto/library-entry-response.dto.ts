export class LibraryEntryResponseDto {
  id!: string;
  entityType!: 'track' | 'album' | 'artist';
  entityId!: string;
  createdAt!: string;
}
