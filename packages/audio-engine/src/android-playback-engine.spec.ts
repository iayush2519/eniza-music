import type { NativePlaybackState } from './native-module';
import type { QueueItem } from './types';

type StateListener = (state: NativePlaybackState) => void;

/**
 * A fake of the native module surface `native-module.ts` declares.
 * `AndroidPlaybackEngine` is the seam being tested here — it owns queue
 * metadata and normalizes native state, so exercising it against a fake
 * native module (rather than a real device) is the correct unit-test
 * boundary. The actual Kotlin implementation
 * (`android/src/main/java/expo/modules/audioengine/AudioEngineModule.kt`)
 * has no JS test harness available in this environment; it's verified by
 * compiling against the real Android Gradle toolchain instead (see the
 * milestone report).
 */
function createFakeNativeModule() {
  let listener: StateListener | undefined;
  let state: NativePlaybackState = {
    currentIndex: -1,
    positionMs: 0,
    durationMs: 0,
    status: 'idle',
    error: null,
    repeatMode: 'off',
    shuffleEnabled: false,
    playbackRate: 1,
    volume: 1,
  };

  return {
    addListener: jest.fn((_event: string, cb: StateListener) => {
      listener = cb;
      return { remove: jest.fn() };
    }),
    loadQueue: jest.fn().mockResolvedValue(undefined),
    setQueue: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
    setShuffleEnabled: jest.fn().mockResolvedValue(undefined),
    setPlaybackRate: jest.fn().mockResolvedValue(undefined),
    setVolume: jest.fn().mockResolvedValue(undefined),
    reorderQueue: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn(() => state),
    // Test helper, not part of the real native module surface: lets a
    // test simulate the native side emitting a new state.
    emit: (next: NativePlaybackState) => {
      state = next;
      listener?.(next);
    },
  };
}

const fakeNativeModule = createFakeNativeModule();

jest.mock('./native-module', () => ({
  loadAudioEngineNativeModule: () => fakeNativeModule,
}));

import { AndroidPlaybackEngine } from './android-playback-engine';

/** A complete `NativePlaybackState`, so every test only needs to specify
 * the fields it actually cares about via `{ ...makeNativeState(), ... }`
 * rather than repeating every field (including the ones this spec added
 * for repeat/shuffle/speed) at every call site. */
function makeNativeState(overrides: Partial<NativePlaybackState> = {}): NativePlaybackState {
  return {
    currentIndex: -1,
    positionMs: 0,
    durationMs: 0,
    status: 'idle',
    error: null,
    repeatMode: 'off',
    shuffleEnabled: false,
    playbackRate: 1,
    volume: 1,
    ...overrides,
  };
}

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
    {
      trackId: 'track-2',
      title: 'Glass Weather',
      artistName: 'Mara Lindqvist',
      artworkUrl: null,
      durationMs: 259_000,
      streamUrl: 'https://example.com/track-2.mp3',
    },
  ];
}

describe('AndroidPlaybackEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('sends only trackId/streamUrl to the native module', async () => {
      const engine = new AndroidPlaybackEngine();
      const queue = createQueue();

      await engine.load(queue, 1);

      expect(fakeNativeModule.loadQueue).toHaveBeenCalledWith(
        [
          { trackId: 'track-1', streamUrl: 'https://example.com/track-1.mp3' },
          { trackId: 'track-2', streamUrl: 'https://example.com/track-2.mp3' },
        ],
        1,
      );
    });

    it('retains full queue metadata for getState() after loading', async () => {
      const engine = new AndroidPlaybackEngine();
      const queue = createQueue();
      await engine.load(queue, 0);

      fakeNativeModule.emit(makeNativeState({ currentIndex: 0, durationMs: 244_000, status: 'ready' }));

      expect(engine.getState().queue).toEqual(queue);
    });
  });

  describe('setQueue', () => {
    it('sends only trackId/streamUrl to the native module', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.setQueue(createQueue());

      expect(fakeNativeModule.setQueue).toHaveBeenCalledWith([
        { trackId: 'track-1', streamUrl: 'https://example.com/track-1.mp3' },
        { trackId: 'track-2', streamUrl: 'https://example.com/track-2.mp3' },
      ]);
    });
  });

  describe('play / pause / stop', () => {
    it('delegates play to the native module', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.play();
      expect(fakeNativeModule.play).toHaveBeenCalledTimes(1);
    });

    it('delegates pause to the native module', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.pause();
      expect(fakeNativeModule.pause).toHaveBeenCalledTimes(1);
    });

    it('delegates stop to the native module and clears the retained queue', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.load(createQueue(), 0);
      await engine.stop();

      expect(fakeNativeModule.stop).toHaveBeenCalledTimes(1);
      expect(engine.getState().queue).toEqual([]);
    });
  });

  describe('getState', () => {
    it('maps a native snapshot into a PlaybackState', () => {
      fakeNativeModule.getState.mockReturnValue(
        makeNativeState({ currentIndex: 1, positionMs: 12_000, durationMs: 259_000, status: 'playing' }),
      );

      const engine = new AndroidPlaybackEngine();
      const state = engine.getState();

      expect(state).toMatchObject({
        currentIndex: 1,
        positionMs: 12_000,
        status: 'playing',
        error: null,
      });
    });

    it('normalizes an unrecognized native status to "error" rather than throwing', () => {
      fakeNativeModule.getState.mockReturnValue(makeNativeState({ status: 'not-a-real-status' }));

      const engine = new AndroidPlaybackEngine();
      expect(engine.getState().status).toBe('error');
    });
  });

  describe('subscribe', () => {
    it('notifies listeners when the native module emits a state change', async () => {
      const engine = new AndroidPlaybackEngine();
      const listener = jest.fn();
      engine.subscribe(listener);

      fakeNativeModule.emit(
        makeNativeState({ currentIndex: 0, positionMs: 5_000, durationMs: 244_000, status: 'buffering' }),
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'buffering', positionMs: 5_000 }),
      );
    });

    it('stops notifying after unsubscribing', () => {
      const engine = new AndroidPlaybackEngine();
      const listener = jest.fn();
      const unsubscribe = engine.subscribe(listener);
      unsubscribe();

      fakeNativeModule.emit(
        makeNativeState({ currentIndex: 0, positionMs: 1_000, durationMs: 244_000, status: 'playing' }),
      );

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('seekTo / skipToNext / skipToPrevious', () => {
    it('delegates seekTo with the given position', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.seekTo(30_000);
      expect(fakeNativeModule.seekTo).toHaveBeenCalledWith(30_000);
    });

    it('delegates skipToNext', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.skipToNext();
      expect(fakeNativeModule.skipToNext).toHaveBeenCalledTimes(1);
    });

    it('delegates skipToPrevious', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.skipToPrevious();
      expect(fakeNativeModule.skipToPrevious).toHaveBeenCalledTimes(1);
    });
  });

  describe('setRepeatMode / setShuffleEnabled / setPlaybackRate / setVolume', () => {
    it('delegates setRepeatMode with the given mode', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.setRepeatMode('all');
      expect(fakeNativeModule.setRepeatMode).toHaveBeenCalledWith('all');
    });

    it('delegates setShuffleEnabled with the given value', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.setShuffleEnabled(true);
      expect(fakeNativeModule.setShuffleEnabled).toHaveBeenCalledWith(true);
    });

    it('delegates setPlaybackRate with the given rate', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.setPlaybackRate(1.5);
      expect(fakeNativeModule.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('delegates setVolume with the given value', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.setVolume(0.5);
      expect(fakeNativeModule.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('reflects repeatMode/shuffleEnabled/playbackRate/volume from a native snapshot', () => {
      fakeNativeModule.getState.mockReturnValue({
        currentIndex: 0,
        positionMs: 0,
        durationMs: 0,
        status: 'playing',
        error: null,
        repeatMode: 'one',
        shuffleEnabled: true,
        playbackRate: 1.25,
        volume: 0.75,
      });

      const engine = new AndroidPlaybackEngine();
      expect(engine.getState()).toMatchObject({
        repeatMode: 'one',
        shuffleEnabled: true,
        playbackRate: 1.25,
        volume: 0.75,
      });
    });

    it('normalizes an unrecognized native repeatMode to "off" rather than throwing', () => {
      fakeNativeModule.getState.mockReturnValue({
        currentIndex: 0,
        positionMs: 0,
        durationMs: 0,
        status: 'idle',
        error: null,
        repeatMode: 'not-a-real-mode',
        shuffleEnabled: false,
        playbackRate: 1,
        volume: 1,
      });

      const engine = new AndroidPlaybackEngine();
      expect(engine.getState().repeatMode).toBe('off');
    });
  });

  describe('reorderQueue', () => {
    it('delegates to the native module with the given indices', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.load(createQueue(), 0);
      await engine.reorderQueue(0, 1);

      expect(fakeNativeModule.reorderQueue).toHaveBeenCalledWith(0, 1);
    });

    it('reorders the locally retained queue metadata to match', async () => {
      const engine = new AndroidPlaybackEngine();
      const queue = createQueue();
      await engine.load(queue, 0);

      await engine.reorderQueue(0, 1);

      fakeNativeModule.emit({
        currentIndex: 1,
        positionMs: 0,
        durationMs: 259_000,
        status: 'playing',
        error: null,
        repeatMode: 'off',
        shuffleEnabled: false,
        playbackRate: 1,
        volume: 1,
      });

      expect(engine.getState().queue).toEqual([queue[1], queue[0]]);
    });

    it('notifies subscribers immediately after a successful reorder, without waiting for a native event', async () => {
      const engine = new AndroidPlaybackEngine();
      const queue = createQueue();
      await engine.load(queue, 0);

      const listener = jest.fn();
      engine.subscribe(listener);

      await engine.reorderQueue(0, 1);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ queue: [queue[1], queue[0]] }));
    });

    it('does not notify subscribers for a no-op reorder (out-of-range or identical indices)', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.load(createQueue(), 0);

      const listener = jest.fn();
      engine.subscribe(listener);

      await engine.reorderQueue(0, 0);
      await engine.reorderQueue(0, 99);

      expect(listener).not.toHaveBeenCalled();
    });

    it('ignores an out-of-range index without throwing or calling the native module incorrectly', async () => {
      const engine = new AndroidPlaybackEngine();
      await engine.load(createQueue(), 0);

      await expect(engine.reorderQueue(0, 99)).resolves.toBeUndefined();
      expect(fakeNativeModule.reorderQueue).toHaveBeenCalledWith(0, 99);
      // Local queue metadata is left untouched since the target index
      // was invalid -- the native call itself may still no-op or throw
      // internally, but this class must not corrupt its own retained
      // queue array in response.
      expect(engine.getState().queue).toEqual(createQueue());
    });
  });
});
