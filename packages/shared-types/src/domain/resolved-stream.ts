/**
 * Response shape for `GET /playback/resolve/:trackId`. Mirrors
 * apps/api/src/playback/dto/resolved-stream-response.dto.ts exactly; that
 * DTO `implements ResolvedStream` so the backend and this contract can
 * never silently drift.
 */
export type ResolvedStream = {
  url: string;
  /** ISO 8601 timestamp the URL stops being valid, or null if it doesn't expire. */
  expiresAt: string | null;
};
