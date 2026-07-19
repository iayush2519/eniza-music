import { NativeModule, requireNativeModule } from 'expo';

/**
 * The wire shape `AudioEngineModule.kt`'s `loadQueue`/`setQueue` accept —
 * deliberately narrower than `QueueItem`: the native player only ever
 * needs a stream URL and an id to build a `MediaItem`
 * (androidx.media3.common.MediaItem); title/artist/artwork stay entirely
 * on the JS side, per the module's own Kotlin-side documentation of that
 * split.
 */
export interface NativeQueueItem {
  trackId: string;
  streamUrl: string;
}

/**
 * The raw snapshot shape emitted by the native module's
 * `onPlaybackStateChanged` event and returned by its synchronous
 * `getState()` — see `fromNativeState` in `android-playback-engine.ts`
 * for how this becomes a `PlaybackState`.
 */
export interface NativePlaybackState {
  currentIndex: number;
  positionMs: number;
  durationMs: number;
  status: string;
  error: string | null;
  /** ExoPlayer's own repeat-mode constant, already normalized to the
   * JS-side string union by the Kotlin module (never the raw
   * `Player.REPEAT_MODE_*` int) — see `AudioEngineModule.kt`'s
   * `buildState`. */
  repeatMode: string;
  shuffleEnabled: boolean;
  playbackRate: number;
}

export type AudioEngineModuleEvents = {
  onPlaybackStateChanged: (state: NativePlaybackState) => void;
};

/**
 * TypeScript declaration for the native module defined in
 * `android/src/main/java/expo/modules/audioengine/AudioEngineModule.kt`.
 * Loaded via `requireNativeModule`, the same mechanism every first-party
 * Expo module (`expo-secure-store`, `expo-image`, ...) uses — this module
 * is discovered the same way, via Expo's autolinking, once
 * `apps/mobile` depends on `@music-app/audio-engine`.
 */
declare class AudioEngineNativeModule extends NativeModule<AudioEngineModuleEvents> {
  loadQueue: (items: NativeQueueItem[], startIndex: number) => Promise<void>;
  setQueue: (items: NativeQueueItem[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  setRepeatMode: (mode: string) => Promise<void>;
  setShuffleEnabled: (enabled: boolean) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
  getState: () => NativePlaybackState;
}

export function loadAudioEngineNativeModule(): AudioEngineNativeModule {
  return requireNativeModule<AudioEngineNativeModule>('AudioEngine');
}
