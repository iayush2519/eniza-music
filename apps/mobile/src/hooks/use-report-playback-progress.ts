import { useEffect } from 'react';

import { apiClient } from '@/lib/api-client';
import { usePlaybackStore } from '@/stores/playback-store';

/** How often to report progress for a track that's continuously
 * playing — frequent enough that "Continue Listening" reflects roughly
 * where the user left off, infrequent enough not to spam the backend on
 * every position tick. */
export const REPORT_INTERVAL_MS = 15_000;

export type ProgressReporter = (trackId: string, positionMs: number, completed?: boolean) => void;

function defaultReporter(trackId: string, positionMs: number, completed?: boolean): void {
  void apiClient.playback.reportProgress({
    trackId,
    positionSeconds: Math.floor(positionMs / 1000),
    ...(completed !== undefined ? { completed } : {}),
  });
}

/**
 * The actual subscription logic behind `useReportPlaybackProgress`,
 * extracted into a plain function (taking the store and a reporter as
 * explicit parameters) so it's directly unit-testable — this app's test
 * setup has no React-hook-rendering utility (no `@testing-library/
 * react-hooks`/`react-test-renderer`; every existing `.spec.ts` tests
 * store/pure logic directly, e.g. `playback-store.spec.ts`), so keeping
 * the real logic outside a `useEffect` closure, callable with a fake
 * store and a `jest.fn()` reporter, follows that same established
 * pattern rather than introducing a new testing dependency for this one
 * hook.
 *
 * Subscribes to the store directly (via `.subscribe`, not a component's
 * render cycle) specifically to get **both** the previous and next state
 * in the same callback: when the current track changes,
 * `previousState.positionMs` is the outgoing track's true last-known
 * position — by the time a component re-renders with the new
 * `currentIndex`, `positionMs` has already moved on to the new track's
 * position (both fields change together in the engine's single `set()`
 * call), so a React-render-cycle-based ref cannot recover the old value.
 * Reading it from the raw subscription callback, before that update is
 * lost, is the only reliable way to get it.
 *
 * `completed` is only ever reported `true` on the engine's own `'ended'`
 * status — a real signal the track finished, not a guess. `skipped` is
 * deliberately never reported from here: the current `PlaybackEngine`
 * contract (see @music-app/audio-engine) has no distinct "the user
 * skipped this" signal separate from "playback moved to a different
 * queue index," so inferring skip-vs-natural-advance would be a guess
 * this hook isn't in a position to make correctly.
 */
export function subscribeToPlaybackProgress(
  store: typeof usePlaybackStore,
  reportProgress: ProgressReporter = defaultReporter,
  intervalMs: number = REPORT_INTERVAL_MS,
): () => void {
  let reportInterval: ReturnType<typeof setInterval> | undefined;

  const clearReportInterval = () => {
    if (reportInterval) {
      clearInterval(reportInterval);
      reportInterval = undefined;
    }
  };

  const startReportInterval = (trackId: string) => {
    clearReportInterval();
    reportInterval = setInterval(() => {
      const state = store.getState();
      const currentTrackId = state.queue[state.currentIndex]?.trackId;
      if (currentTrackId === trackId) {
        reportProgress(trackId, state.positionMs);
      }
    }, intervalMs);
  };

  // Handles the (unusual but possible) case where playback is already
  // in progress at the moment this subscription starts — `subscribe`
  // alone only fires on *subsequent* changes, so without this, a track
  // already playing when the app root mounts would never get its
  // periodic interval started until the next status/track change.
  const initialState = store.getState();
  const initialTrackId = initialState.queue[initialState.currentIndex]?.trackId;
  if (initialState.status === 'playing' && initialTrackId) {
    startReportInterval(initialTrackId);
  }

  const unsubscribe = store.subscribe((state, previousState) => {
    const previousTrackId = previousState.queue[previousState.currentIndex]?.trackId;
    const currentTrackId = state.queue[state.currentIndex]?.trackId;

    if (previousTrackId && previousTrackId !== currentTrackId) {
      // The queue advanced to a different track (or was cleared) —
      // report the outgoing track's true last-known position, read from
      // `previousState` before it's gone.
      reportProgress(previousTrackId, previousState.positionMs);
    }

    if (state.status === 'paused' && currentTrackId) {
      clearReportInterval();
      reportProgress(currentTrackId, state.positionMs);
    } else if (state.status === 'ended' && currentTrackId) {
      clearReportInterval();
      reportProgress(currentTrackId, state.positionMs, true);
    } else if (state.status === 'playing' && currentTrackId && currentTrackId !== previousTrackId) {
      startReportInterval(currentTrackId);
    }
  });

  return () => {
    clearReportInterval();
    unsubscribe();
  };
}

/**
 * The write side of Home's "Continue Listening" section (see
 * apps/api/src/recommendations/recommendations.service.ts's
 * `getContinueListening`): periodically, and on pause, track change, or
 * the track ending, reports the queue item's position to
 * `POST /playback/progress`.
 *
 * Mounted once at the app root (see apps/mobile/src/app/_layout.tsx),
 * not inside any one screen — playback continues across screens/tabs
 * (the sticky `MiniPlayer` is proof of that), so progress reporting must
 * not depend on a particular screen staying mounted.
 */
export function useReportPlaybackProgress(): void {
  useEffect(() => subscribeToPlaybackProgress(usePlaybackStore), []);
}
