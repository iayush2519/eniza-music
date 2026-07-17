import type { QueueItem } from './types';

/**
 * The subset of `@music-app/shared-types`' `Track` this package actually
 * needs, expressed structurally rather than imported directly — keeps
 * `audio-engine` decoupled from any specific backend/catalog schema, the
 * same reasoning `StreamUrlProvider` applies in types.ts. Any object with
 * this shape works, including a real `Track`.
 */
export interface QueueableTrack {
  id: string;
  title: string;
  durationSeconds: number;
  coverArtUrl: string | null;
}

/**
 * Builds a `QueueItem` from a catalog track, with `streamUrl` left `null`
 * until `resolveQueueItemStream` fills it in.
 *
 * `artistName` is a separate parameter, not read off the track, because
 * `Track` only carries `artistId` (see
 * apps/mobile/src/hooks/use-artist-name-map.ts) — the caller resolves the
 * id to a name the same way every other track-rendering surface in the
 * app already does, rather than this package inventing a second lookup.
 */
export function toQueueItem(track: QueueableTrack, artistName: string | null = null): QueueItem {
  return {
    trackId: track.id,
    title: track.title,
    artistName,
    artworkUrl: track.coverArtUrl,
    durationMs: track.durationSeconds * 1000,
    streamUrl: null,
  };
}
