/**
 * @music-app/audio-engine
 *
 * Platform-abstracted playback engine. The `PlaybackEngine` interface and
 * its Android Media3/ExoPlayer-backed native implementation are built in
 * Phase 5 (Audio playback engine) — see docs/architecture/audio-engine.md
 * and docs/decisions/0002-custom-audio-engine-over-rntp.md for the design.
 *
 * Left empty in Phase 1 — this package exists now so the workspace
 * dependency graph and build pipeline are correct before any native module
 * work starts.
 */

export const AUDIO_ENGINE_PACKAGE_NAME = '@music-app/audio-engine' as const;
