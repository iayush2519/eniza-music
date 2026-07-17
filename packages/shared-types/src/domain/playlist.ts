import { Track } from './track';

/**
 * Playlist — belongs to one user. Mirrors
 * apps/api/src/library/dto/playlist-response.dto.ts.
 */
export type Playlist = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
};

export type PlaylistWithTracks = Playlist & {
  tracks: Track[];
};
