import { AndroidPlaybackEngine, type PlaybackEngine } from '@music-app/audio-engine';

/**
 * The app's single `PlaybackEngine` instance, isolated in its own module —
 * the same pattern `api-client.ts` uses for `apiClient`. Keeping "how do
 * we construct the concrete engine" in one small file (rather than inline
 * in `playback-store.ts`) means the store itself only ever depends on the
 * `PlaybackEngine` interface, and this file is the one seam a test mocks
 * to substitute a fake engine — see `stores/playback-store.spec.ts`.
 *
 * `AndroidPlaybackEngine` is the only implementation that exists today
 * (see ADR 0002); swapping in an iOS implementation later means changing
 * only this file, not `playback-store.ts` or anything that consumes it.
 */
export const playbackEngine: PlaybackEngine = new AndroidPlaybackEngine();
