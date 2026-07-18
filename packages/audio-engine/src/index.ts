/**
 * @music-app/audio-engine
 *
 * The platform-abstraction boundary for playback — see
 * docs/architecture/audio-engine.md and
 * docs/decisions/0002-custom-audio-engine-over-rntp.md.
 *
 * Milestone 1 defined the `PlaybackEngine` contract and the pure,
 * dependency-light queue-building/stream-resolution logic around it.
 * Milestone 2 adds the first real implementation of that contract:
 * `AndroidPlaybackEngine`, backed by a Media3/ExoPlayer native module
 * (`android/src/main/java/expo/modules/audioengine/AudioEngineModule.kt`).
 * Everything else (a Zustand store, UI) is still meant to depend only on
 * the `PlaybackEngine` interface, not on `AndroidPlaybackEngine`
 * directly, so a future iOS implementation can be swapped in behind the
 * same interface per ADR 0002.
 *
 * A foreground `MediaSessionService` (background survival, lock-screen/
 * notification controls) and an Expo config plugin for it are explicitly
 * out of scope for this milestone — tracked as later Phase 5 work.
 */
export * from './types';
export * from './playback-engine';
export * from './android-playback-engine';
export * from './queue-item';
export * from './stream-resolver';
