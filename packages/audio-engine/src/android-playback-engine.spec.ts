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

      fakeNativeModule.emit({ currentIndex: 0, positionMs: 0, durationMs: 244_000, status: 'ready', error: null });

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
      fakeNativeModule.getState.mockReturnValue({
        currentIndex: 1,
        positionMs: 12_000,
        durationMs: 259_000,
        status: 'playing',
        error: null,
      });

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
      fakeNativeModule.getState.mockReturnValue({
        currentIndex: 0,
        positionMs: 0,
        durationMs: 0,
        status: 'not-a-real-status',
        error: null,
      });

      const engine = new AndroidPlaybackEngine();
      expect(engine.getState().status).toBe('error');
    });
  });

  describe('subscribe', () => {
    it('notifies listeners when the native module emits a state change', async () => {
      const engine = new AndroidPlaybackEngine();
      const listener = jest.fn();
      engine.subscribe(listener);

      fakeNativeModule.emit({
        currentIndex: 0,
        positionMs: 5_000,
        durationMs: 244_000,
        status: 'buffering',
        error: null,
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'buffering', positionMs: 5_000 }),
      );
    });

    it('stops notifying after unsubscribing', () => {
      const engine = new AndroidPlaybackEngine();
      const listener = jest.fn();
      const unsubscribe = engine.subscribe(listener);
      unsubscribe();

      fakeNativeModule.emit({
        currentIndex: 0,
        positionMs: 1_000,
        durationMs: 244_000,
        status: 'playing',
        error: null,
      });

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
});
