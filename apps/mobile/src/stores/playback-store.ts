import type { PlaybackState, QueueItem } from '@music-app/audio-engine';
import { create } from 'zustand';

import { playbackEngine } from '@/lib/playback-engine';

/**
 * The thin Zustand wrapper around `packages/audio-engine`'s own event
 * stream, per docs/architecture/state-management.md's "Live playback
 * state" row. This store does not own playback state — the
 * `PlaybackEngine` (native side) does. Every field below is only ever
 * written by the `playbackEngine.subscribe()` callback registered at
 * store creation; action methods never call `set()` directly themselves,
 * they only call through to the engine and let its next emitted state
 * flow back through that same subscription.
 *
 * This mirrors the single-direction rule from
 * docs/architecture/audio-engine.md: "native engine → PlaybackEngine.
 * subscribe() → Zustand store → React components" — no component reads
 * `playbackEngine.getState()` directly, and no component mutates
 * playback state directly; every control action here calls through to
 * `playbackEngine` and waits for the resulting state change to arrive
 * via the subscription, rather than updating the store optimistically.
 * This is what keeps the UI from disagreeing with the engine after a
 * native error or an unexpected state transition.
 *
 * Queue building (turning catalog/search/recommendation tracks into
 * `QueueItem[]`) and stream-URL resolution are deliberately NOT this
 * store's job — `load`/`setQueue` below accept an already-built
 * `QueueItem[]` and pass it straight through. A higher-level action
 * (`playFromList`, added when stream resolution is wired in) is what
 * calls `toQueueItem`/`resolveQueueItemStream` before calling `load`.
 */
type PlaybackStoreState = PlaybackState & {
  load: (queue: QueueItem[], startIndex: number) => Promise<void>;
  setQueue: (queue: QueueItem[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
};

export const usePlaybackStore = create<PlaybackStoreState>((set) => {
  playbackEngine.subscribe((state) => set(state));

  return {
    ...playbackEngine.getState(),

    load: (queue, startIndex) => playbackEngine.load(queue, startIndex),
    setQueue: (queue) => playbackEngine.setQueue(queue),
    play: () => playbackEngine.play(),
    pause: () => playbackEngine.pause(),
    seekTo: (positionMs) => playbackEngine.seekTo(positionMs),
    skipToNext: () => playbackEngine.skipToNext(),
    skipToPrevious: () => playbackEngine.skipToPrevious(),
  };
});
