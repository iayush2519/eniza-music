import { resolveQueueItemStream, toQueueItem, type QueueItem } from '@music-app/audio-engine';
import type { Track } from '@music-app/shared-types';

import { apiClient } from './api-client';

/**
 * Builds a full queue from a list of tracks and starts playback at
 * `startIndex`, resolving every item's stream URL first.
 *
 * This is the "higher-level action" `playback-store.ts`'s own module doc
 * anticipates ("added when stream resolution is wired in... calls
 * `toQueueItem`/`resolveQueueItemStream` before calling `load`") — kept
 * here rather than inside the store itself so the store stays a thin,
 * dependency-light mirror of the engine (per its existing module doc),
 * and so this file is the one seam that depends on `apiClient`.
 *
 * Every item is resolved up front (not lazily, one-at-a-time as playback
 * reaches it) — the current `PlaybackClient`/native module contract has
 * no "resolve the next item just before it's needed" hook, and resolving
 * eagerly is the simplest correct behavior for a queue of the sizes this
 * app builds today (a single recommendation section or search result
 * page, not a multi-hour queue). Revisit if that assumption changes.
 */
export async function buildResolvedQueue(
  tracks: Track[],
  startIndex: number,
  artistNames: Map<string, string>,
): Promise<{ queue: QueueItem[]; startIndex: number }> {
  const unresolved = tracks.map((track) => toQueueItem(track, artistNames.get(track.artistId) ?? null));
  const resolved = await Promise.all(
    unresolved.map((item) => resolveQueueItemStream(apiClient.playback, item)),
  );
  return { queue: resolved, startIndex };
}
