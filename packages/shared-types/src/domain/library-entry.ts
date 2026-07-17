/**
 * A user's saved/liked/followed catalog entity. Mirrors
 * apps/api/src/library/dto/library-entry-response.dto.ts.
 */
export type LibraryEntityType = 'track' | 'album' | 'artist';

export type LibraryEntry = {
  id: string;
  entityType: LibraryEntityType;
  entityId: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
};
