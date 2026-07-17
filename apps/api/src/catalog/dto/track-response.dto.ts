import type { Track } from '@music-app/shared-types';

/**
 * `implements Track` pins this DTO to the shared contract in
 * @music-app/shared-types — if this shape and the mobile app's expected
 * `Track` type ever diverge, this file fails to compile.
 */
export class TrackResponseDto implements Track {
  id!: string;
  artistId!: string;
  albumId!: string | null;
  title!: string;
  durationSeconds!: number;
  trackNumber!: number | null;
  audioUrl!: string | null;
  coverArtUrl!: string | null;
}
