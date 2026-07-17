import type { QueueItem, StreamUrlProvider } from './types';

/**
 * Resolves a `QueueItem`'s stream URL against a `StreamUrlProvider` —
 * satisfied by `@music-app/api-client`'s `PlaybackClient` without this
 * package depending on it directly (see types.ts). Always calls the
 * provider fresh rather than caching the result: a resolved URL can be
 * short-lived (`expiresAt`), so re-resolving right before playback is the
 * correct default — caching could hand back a URL that's already expired
 * by the time it's actually used.
 *
 * Returns a new `QueueItem` (does not mutate the input) with `streamUrl`
 * populated. Rejects if resolution fails; callers (e.g. a playback store)
 * are expected to catch this and surface a `PlaybackStatus: 'error'`
 * state rather than this function swallowing the error itself.
 */
export async function resolveQueueItemStream(
  provider: StreamUrlProvider,
  item: QueueItem,
): Promise<QueueItem> {
  const { url } = await provider.resolveStreamUrl(item.trackId);
  return { ...item, streamUrl: url };
}
