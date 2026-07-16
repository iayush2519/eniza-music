# ADR 0002: Custom Media3/ExoPlayer audio engine instead of react-native-track-player

**Status:** Accepted
**Date:** 2026-07-16

## Context

react-native-track-player (RNTP) is the de facto standard audio playback
library for React Native music apps and was the default assumption entering
this project. As of RNTP v5, the project is **commercially licensed**:
personal/educational use remains free, but commercial use requires a paid
license (€99/mo single app, €249/mo up to 5 apps, or custom platform
pricing — see https://rntp.dev/pricing). v4 remains available under
Apache-2.0 on a separate branch but will not receive New Architecture
support or future features.

Audio playback is the core value proposition of this product, not a
peripheral feature.

## Decision

Build a custom native audio engine on Android Media3/ExoPlayer, wrapped in
a platform-agnostic `PlaybackEngine` TypeScript interface inside
`packages/audio-engine`. No dependency on RNTP in any version.

## Alternatives considered

- **RNTP v5 (paid).** Fastest path, actively maintained, New Architecture
  support out of the box. Rejected as the primary choice: introduces a
  recurring cost and vendor dependency for the single most important
  subsystem in the app, in a project whose explicit goal includes being
  original and portfolio-quality (owning this subsystem is a stronger
  demonstration of engineering depth).
- **RNTP v4 (free, Apache-2.0).** No cost, but frozen feature set and no
  guaranteed New Architecture compatibility going forward, which conflicts
  with the decision to build exclusively on the New Architecture (Reanimated
  4 / Gesture Handler 3 already require it). Rejected due to long-term
  maintenance risk.
- **expo-audio.** Expo's own audio module supports background playback and
  lock-screen controls on Android via a foreground service, and would
  reduce native code we own. Rejected as the *primary* engine because it is
  a general-purpose audio API, not built around queue/playlist primitives
  the way ExoPlayer's own playlist APIs are — we'd end up reimplementing
  queue logic in JS regardless. Worth revisiting if the custom module proves
  too costly, but not the starting point.

## Consequences

- We own bugs and edge cases (Bluetooth route changes, Doze/battery
  restrictions, buffering) that a mature third-party library would already
  have handled. Real-device testing (not just emulator) is required.
- iOS playback needs a separate AVPlayer-backed implementation of the same
  `PlaybackEngine` interface when iOS is prioritized — deferred, not
  blocked, because the interface is designed for multiple implementations.
- No recurring third-party licensing cost.
- This becomes a genuine, demonstrable native engineering component in the
  portfolio, which aligns with the project's stated goals.
