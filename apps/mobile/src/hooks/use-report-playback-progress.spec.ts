import type { PlaybackState, QueueItem } from '@music-app/audio-engine';

// `use-report-playback-progress.ts` imports `@/lib/api-client` (for its
// default reporter) and `@/stores/playback-store` (only for that
// store's type) at module scope. Both are mocked here — the first the
// same way `playback-store.spec.ts` mocks `@/lib/playback-engine`, the
// second because `usePlaybackStore` itself transitively imports
// `@music-app/audio-engine`'s native module boundary, which isn't
// loadable under Node/Jest. Every test below passes its own fake store
// and `reportProgress` spy anyway, so neither mock's actual shape
// matters — this only prevents the real, unloadable module graph from
// being pulled in at all.
jest.mock('@/lib/api-client', () => ({ apiClient: { playback: { reportProgress: jest.fn() } } }));
jest.mock('@/lib/playback-engine', () => ({ playbackEngine: { subscribe: jest.fn(), getState: jest.fn() } }));

// eslint-disable-next-line import/first
import { subscribeToPlaybackProgress } from './use-report-playback-progress';

type Listener = (state: PlaybackState, previousState: PlaybackState) => void;

/**
 * A minimal fake matching the one surface `subscribeToPlaybackProgress`
 * actually uses (`getState`/`subscribe`), rather than a real Zustand
 * store — mirrors `playback-store.spec.ts`'s own `createFakeEngine`
 * pattern for testing against a hand-rolled double of a dependency's
 * public shape.
 */
function createFakeStore(initial: PlaybackState) {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Test helper: applies a partial update and notifies subscribers
    // with both the new and previous state, matching Zustand's own
    // `subscribe` callback signature.
    setState: (partial: Partial<PlaybackState>) => {
      const previous = state;
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener(state, previous));
    },
  };
}

function makeQueueItem(trackId: string, overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    trackId,
    title: 'Track',
    artistName: null,
    artworkUrl: null,
    durationMs: 200_000,
    streamUrl: 'https://example.com/track.mp3',
    ...overrides,
  };
}

const IDLE_STATE: PlaybackState = {
  queue: [],
  currentIndex: -1,
  positionMs: 0,
  status: 'idle',
  error: null,
  repeatMode: 'off',
  shuffleEnabled: false,
  playbackRate: 1,
  volume: 1,
};

describe('subscribeToPlaybackProgress', () => {
  it('reports the current position when playback pauses', () => {
    const store = createFakeStore(IDLE_STATE);
    const reportProgress = jest.fn();
    const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 15_000);

    store.setState({ queue: [makeQueueItem('track-1')], currentIndex: 0, status: 'playing' });
    store.setState({ positionMs: 42_000, status: 'paused' });

    expect(reportProgress).toHaveBeenCalledWith('track-1', 42_000);
    unsubscribe();
  });

  it('reports completed: true when playback ends', () => {
    const store = createFakeStore(IDLE_STATE);
    const reportProgress = jest.fn();
    const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 15_000);

    store.setState({ queue: [makeQueueItem('track-1')], currentIndex: 0, status: 'playing' });
    store.setState({ positionMs: 200_000, status: 'ended' });

    expect(reportProgress).toHaveBeenCalledWith('track-1', 200_000, true);
    unsubscribe();
  });

  it("reports the outgoing track's true last-known position when the queue advances", () => {
    const store = createFakeStore(IDLE_STATE);
    const reportProgress = jest.fn();
    const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 15_000);

    store.setState({
      queue: [makeQueueItem('track-1'), makeQueueItem('track-2')],
      currentIndex: 0,
      status: 'playing',
      positionMs: 190_000,
    });

    // The queue advances to track-2 — positionMs resets to 0 for the new
    // track in the same update, exactly as the real engine would report
    // it. The outgoing track's position (190_000, not 0) must still be
    // what gets reported for track-1.
    store.setState({ currentIndex: 1, positionMs: 0 });

    expect(reportProgress).toHaveBeenCalledWith('track-1', 190_000);
    unsubscribe();
  });

  it('starts a periodic interval while playing and stops it on pause', () => {
    jest.useFakeTimers();
    try {
      const store = createFakeStore(IDLE_STATE);
      const reportProgress = jest.fn();
      const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 1_000);

      store.setState({ queue: [makeQueueItem('track-1')], currentIndex: 0, status: 'playing' });
      reportProgress.mockClear();

      store.setState({ positionMs: 5_000 });
      jest.advanceTimersByTime(1_000);
      expect(reportProgress).toHaveBeenCalledWith('track-1', 5_000);

      reportProgress.mockClear();
      store.setState({ status: 'paused' });
      reportProgress.mockClear(); // clear the pause-triggered report itself
      jest.advanceTimersByTime(5_000);
      // The interval was cleared on pause -- no further periodic reports.
      expect(reportProgress).not.toHaveBeenCalled();

      unsubscribe();
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts reporting immediately for a track already playing when the subscription begins', () => {
    jest.useFakeTimers();
    try {
      const alreadyPlaying: PlaybackState = {
        queue: [makeQueueItem('track-1')],
        currentIndex: 0,
        positionMs: 10_000,
        status: 'playing',
        error: null,
        repeatMode: 'off',
        shuffleEnabled: false,
        playbackRate: 1,
        volume: 1,
      };
      const store = createFakeStore(alreadyPlaying);
      const reportProgress = jest.fn();
      const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 1_000);

      jest.advanceTimersByTime(1_000);

      expect(reportProgress).toHaveBeenCalledWith('track-1', 10_000);
      unsubscribe();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not report anything for an idle store with no queue', () => {
    const store = createFakeStore(IDLE_STATE);
    const reportProgress = jest.fn();
    const unsubscribe = subscribeToPlaybackProgress(store as never, reportProgress, 15_000);

    expect(reportProgress).not.toHaveBeenCalled();
    unsubscribe();
  });
});
