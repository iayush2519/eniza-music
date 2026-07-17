/**
 * Album — belongs to one artist. Mirrors
 * apps/api/src/catalog/dto/album-response.dto.ts.
 */
export type Album = {
  id: string;
  artistId: string;
  title: string;
  coverArtUrl: string | null;
  /** ISO 8601 date string, or null if unset. */
  releasedAt: string | null;
};
