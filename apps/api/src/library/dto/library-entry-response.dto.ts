import type { LibraryEntry } from '@music-app/shared-types';

export class LibraryEntryResponseDto implements LibraryEntry {
  id!: string;
  entityType!: 'track' | 'album' | 'artist';
  entityId!: string;
  createdAt!: string;
}
