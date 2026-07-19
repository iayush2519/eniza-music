import type { PlaybackState, QueueItem, RepeatMode } from './types';

/**
 * The platform-abstraction boundary described in
 * docs/architecture/audio-engine.md: the rest of the app (UI, state,
 * navigation) never talks to ExoPlayer, a `MediaSession`, or any other
 * native playback API directly — only to this interface.
 *
 * No implementation of this interface exists yet. A concrete Android
 * implementation (Media3/ExoPlayer, a foreground `MediaSessionService`,
 * and an Expo config plugin to wire it into the native project) is real
 * native engineering that needs a working Android build toolchain and
 * real-device testing to verify — that is a later Phase 5 milestone, not
 * this one. Defining the contract first is the correct order for this
 * seam regardless: every future implementation (this Android one, and an
 * iOS/AVPlayer one later per ADR 0002) must satisfy this interface
 * identically, so it needs to exist and be stable before either is built
 * against it.
 *
 * Queue navigation (skip/next/previous, repeat, gapless playback) is
 * deliberately owned by the native engine's own playlist primitives, per
 * docs/architecture/audio-engine.md ("Queue management lives natively...
 * rather than reimplemented in JS") — this interface exposes `skipToNext`/
 * `skipToPrevious` as commands the engine executes, not JS-side index
 * arithmetic the caller performs.
 */
export interface PlaybackEngine {
  load(queue: QueueItem[], startIndex: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  setQueue(queue: QueueItem[]): Promise<void>;
  /** Sets the engine's repeat mode — see `RepeatMode`'s own doc comment
   * for why this is a native command, not JS-side index arithmetic. */
  setRepeatMode(mode: RepeatMode): Promise<void>;
  /** Toggles the engine's own shuffle-ordering of the queue, same
   * "native owns queue navigation" rule as `setRepeatMode`. */
  setShuffleEnabled(enabled: boolean): Promise<void>;
  /** Sets ExoPlayer's playback speed multiplier (1.0 = normal). */
  setPlaybackRate(rate: number): Promise<void>;
  /** Sets ExoPlayer's output volume, 0 (silent) to 1 (full) — the
   * "VolumeControl" docs/design/design-system-specification.md's Full
   * Player hierarchy names ("VolumeControl_ContextMenuActions"). This is
   * the player's own in-app volume multiplier (`ExoPlayer.setVolume`),
   * distinct from the device's hardware volume (which the OS already
   * exposes its own UI for) — the same distinction every mainstream
   * player app's in-player volume slider makes. */
  setVolume(volume: number): Promise<void>;
  /**
   * Moves the queue item at `fromIndex` to `toIndex`, delegating to the
   * native player's own playlist-reorder primitive
   * (`ExoPlayer.moveMediaItem`) rather than rebuilding the whole queue
   * via `setQueue` — preserves playback position/state exactly, the same
   * reasoning `setQueue` itself already documents for not resetting
   * position on a queue replacement.
   */
  reorderQueue(fromIndex: number, toIndex: number): Promise<void>;
  /** A synchronous snapshot of the current state. */
  getState(): PlaybackState;
  /** Registers a listener for state changes; returns an unsubscribe function. */
  subscribe(listener: (state: PlaybackState) => void): () => void;
}
