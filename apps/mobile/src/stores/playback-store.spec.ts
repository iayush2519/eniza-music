import type { PlaybackEngine, PlaybackState, QueueItem } from '@music-app/audio-engine';

type StateListener = (state: PlaybackState) => void;

const IDLE_STATE: PlaybackState = {
  queue: [],
  currentIndex: -1,
  positionMs: 0,
  status: 'idle',
  error: null,
};

/**
 * A fake `PlaybackEngine` — the store's own dependency boundary (see
 * `@/lib/playback-engine`), mocked the same way `android-playback-engine.
 * spec.ts` mocks its native-module boundary one layer down. This lets the
 * store's wiring (subscribe-once, action passthrough, no optimistic
 * local state) be verified without a real `AndroidPlaybackEngine` or
 * native module, neither of which are loadable under Node/Jest.
 */
function createFakeEngine(): PlaybackEngine & { emit: (state: PlaybackState) => void } {
  let listener: StateListener | undefined;
  let state = IDLE_STATE;

  return {
    load: jest.fn().mockResolvedValue(undefined),
    setQueue: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn(() => state),
    subscribe: jest.fn((cb: StateListener) => {
      listener = cb;
      return () => {
        listener = undefined;
      };
    }),
    // Test helper, not part of the real `PlaybackEngine` interface: lets
    // a test simulate the engine emitting a new state.
    emit: (next) => {
      state = next;
      listener?.(next);
    },
  };
}

const fakeEngine = createFakeEngine();

jest.mock('@/lib/playback-engine', () => ({ playbackEngine: fakeEngine }));

// Imported after the mock is registered, matching the ordering
// `android-playback-engine.spec.ts` uses for the same reason: the module
// under test resolves its dependency at import time.
// eslint-disable-next-line import/first
import { usePlaybackStore } from './playback-store';

function createQueue(): QueueItem[] {
  return [
    {
      trackId: 'track-1',
      title: 'Slow Static',
      artistName: 'Mara Lindqvist',
      artworkUrl: null,
      durationMs: 244_000,
      streamUrl: 'https://example.com/track-1.mp3',
    },
  ];
}

describe('usePlaybackStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeEngine.emit(IDLE_STATE);
  });

  it('initializes from the engine\'s current state', () => {
    expect(usePlaybackStore.getState()).toMatchObject(IDLE_STATE);
  });

  it('updates store state when the engine emits a new state', () => {
    const playingState: PlaybackState = {
      queue: createQueue(),
      currentIndex: 0,
      positionMs: 5_000,
      status: 'playing',
      error: null,
    };

    fakeEngine.emit(playingState);

    expect(usePlaybackStore.getState()).toMatchObject(playingState);
  });

  it('delegates load() to the engine without applying optimistic local state', async () => {
    const queue = createQueue();
    await usePlaybackStore.getState().load(queue, 0);

    expect(fakeEngine.load).toHaveBeenCalledWith(queue, 0);
    // No optimistic update — the store's queue only changes once the
    // engine emits a state that reflects it.
    expect(usePlaybackStore.getState().queue).toEqual([]);
  });

  it('delegates setQueue() to the engine', async () => {
    const queue = createQueue();
    await usePlaybackStore.getState().setQueue(queue);

    expect(fakeEngine.setQueue).toHaveBeenCalledWith(queue);
  });

  it('delegates play() to the engine', async () => {
    await usePlaybackStore.getState().play();
    expect(fakeEngine.play).toHaveBeenCalledTimes(1);
  });

  it('delegates pause() to the engine', async () => {
    await usePlaybackStore.getState().pause();
    expect(fakeEngine.pause).toHaveBeenCalledTimes(1);
  });

  it('delegates seekTo() to the engine with the given position', async () => {
    await usePlaybackStore.getState().seekTo(30_000);
    expect(fakeEngine.seekTo).toHaveBeenCalledWith(30_000);
  });

  it('delegates skipToNext() to the engine', async () => {
    await usePlaybackStore.getState().skipToNext();
    expect(fakeEngine.skipToNext).toHaveBeenCalledTimes(1);
  });

  it('delegates skipToPrevious() to the engine', async () => {
    await usePlaybackStore.getState().skipToPrevious();
    expect(fakeEngine.skipToPrevious).toHaveBeenCalledTimes(1);
  });

  it('reflects an error state emitted by the engine without throwing', () => {
    fakeEngine.emit({
      queue: [],
      currentIndex: -1,
      positionMs: 0,
      status: 'error',
      error: 'Playback failed',
    });

    expect(usePlaybackStore.getState()).toMatchObject({
      status: 'error',
      error: 'Playback failed',
    });
  });
});
