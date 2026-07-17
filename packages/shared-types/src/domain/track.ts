/**
 * Track — belongs to one artist, optionally part of one album. Mirrors
 * apps/api/src/catalog/dto/track-response.dto.ts exactly; that DTO
 * `implements Track` so the backend and this contract can never silently
 * drift (a TypeScript compile error is raised the moment they diverge).
 */
export type Track = {
  id: string;
  artistId: string;
  albumId: string | null;
  title: string;
  durationSeconds: number;
  trackNumber: number | null;
  audioUrl: string;
  coverArtUrl: string | null;
};
