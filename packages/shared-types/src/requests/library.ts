import { LibraryEntityType } from '../domain/library-entry';

/** Mirrors apps/api/src/library/dto/create-playlist.dto.ts. */
export type CreatePlaylistRequest = {
  title: string;
  description?: string;
};

/** Mirrors apps/api/src/library/dto/update-playlist.dto.ts. */
export type UpdatePlaylistRequest = {
  title?: string;
  description?: string;
};

/** Mirrors apps/api/src/library/dto/add-playlist-track.dto.ts. */
export type AddPlaylistTrackRequest = {
  trackId: string;
};

/** Mirrors apps/api/src/library/dto/save-library-entry.dto.ts. */
export type SaveLibraryEntryRequest = {
  entityType: LibraryEntityType;
  entityId: string;
};
