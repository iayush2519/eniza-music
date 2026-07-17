/**
 * @music-app/audio-engine
 *
 * The platform-abstraction boundary for playback — see
 * docs/architecture/audio-engine.md and
 * docs/decisions/0002-custom-audio-engine-over-rntp.md.
 *
 * This first Phase 5 milestone defines the `PlaybackEngine` contract and
 * the pure, dependency-light queue-building and stream-resolution logic
 * around it — the parts of the system that don't depend on which
 * platform/native player eventually implements `PlaybackEngine`. No
 * concrete `PlaybackEngine` implementation exists yet: the native Android
 * module (Media3/ExoPlayer, a foreground `MediaSessionService`, and an
 * Expo config plugin) is real native engineering and real-device testing
 * on its own, tracked as a later Phase 5 milestone.
 */
export * from './types';
export * from './playback-engine';
export * from './queue-item';
export * from './stream-resolver';
