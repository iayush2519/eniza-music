import type { PlaybackEngine } from './playback-engine';
import { loadAudioEngineNativeModule, NativePlaybackState, NativeQueueItem } from './native-module';
import type { PlaybackState, PlaybackStatus, QueueItem } from './types';

const VALID_STATUSES: readonly PlaybackStatus[] = [
  'idle',
  'loading',
  'ready',
  'playing',
  'paused',
  'buffering',
  'ended',
  'error',
];

/**
 * The first real `PlaybackEngine` implementation — Android, backed by
 * Media3/ExoPlayer via `AudioEngineModule.kt`, per
 * docs/architecture/audio-engine.md and ADR 0002. This is the only place
 * in the app that talks to the native module directly; everything else
 * (a future Zustand store, UI) depends only on the `PlaybackEngine`
 * interface from `playback-engine.ts`, unchanged since Milestone 1.
 *
 * Queue metadata (title/artist/artwork) is kept here, in JS, indexed by
 * position — the native side only ever receives `trackId`/`streamUrl`
 * (see `native-module.ts`), so this class is what reunites a native state
 * snapshot's `currentIndex` with the rest of a `QueueItem`'s metadata for
 * `getState()`/`subscribe()` callers.
 */
export class AndroidPlaybackEngine implements PlaybackEngine {
  private readonly native = loadAudioEngineNativeModule();
  private queue: QueueItem[] = [];
  private listeners = new Set<(state: PlaybackState) => void>();
  private latestNativeState: NativePlaybackState = {
    currentIndex: -1,
    positionMs: 0,
    durationMs: 0,
    status: 'idle',
    error: null,
  };

  constructor() {
    this.native.addListener('onPlaybackStateChanged', (nativeState) => {
      this.latestNativeState = nativeState;
      this.notifyListeners();
    });
  }

  async load(queue: QueueItem[], startIndex: number): Promise<void> {
    this.queue = queue;
    await this.native.loadQueue(queue.map(toNativeQueueItem), startIndex);
  }

  async setQueue(queue: QueueItem[]): Promise<void> {
    this.queue = queue;
    await this.native.setQueue(queue.map(toNativeQueueItem));
  }

  play(): Promise<void> {
    return this.native.play();
  }

  pause(): Promise<void> {
    return this.native.pause();
  }

  async stop(): Promise<void> {
    await this.native.stop();
    this.queue = [];
  }

  seekTo(positionMs: number): Promise<void> {
    return this.native.seekTo(positionMs);
  }

  skipToNext(): Promise<void> {
    return this.native.skipToNext();
  }

  skipToPrevious(): Promise<void> {
    return this.native.skipToPrevious();
  }

  getState(): PlaybackState {
    return this.toPlaybackState(this.native.getState());
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.toPlaybackState(this.latestNativeState);
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private toPlaybackState(nativeState: NativePlaybackState): PlaybackState {
    return {
      queue: this.queue,
      currentIndex: nativeState.currentIndex,
      positionMs: nativeState.positionMs,
      status: normalizeStatus(nativeState.status),
      error: nativeState.error,
    };
  }
}

function toNativeQueueItem(item: QueueItem): NativeQueueItem {
  return { trackId: item.trackId, streamUrl: item.streamUrl ?? '' };
}

/**
 * Defends against a native/JS contract drift (e.g. a status string typo
 * introduced on the Kotlin side) surfacing as a runtime crash somewhere
 * deep in a UI render — falls back to `'error'` with a descriptive
 * message instead, which is a status every consumer of `PlaybackState`
 * already has to handle.
 */
function normalizeStatus(status: string): PlaybackStatus {
  if ((VALID_STATUSES as readonly string[]).includes(status)) {
    return status as PlaybackStatus;
  }
  return 'error';
}
