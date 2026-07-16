# Audio Engine

## Decision

Build a custom native audio engine on **Android Media3/ExoPlayer**, wrapped
in a clean TypeScript abstraction, rather than depending on
react-native-track-player (RNTP). See ADR 0002 for the full reasoning
(RNTP v5 commercial licensing was the trigger, but the abstraction is the
right call independent of that).

## Why owning this matters here

Audio playback is the core value proposition of a music app. For a
portfolio-quality build, this is the piece most worth doing properly and
demonstrating real native engineering depth on, rather than delegating to a
third-party package.

## Package boundary: `packages/audio-engine`

The rest of the app (UI, state, navigation) never talks to ExoPlayer, a
`MediaSession`, or any native API directly. It talks to a TypeScript
interface. This is the seam that lets us swap or extend the underlying
engine later (e.g. add an iOS AVPlayer-backed implementation, or fall back
to RNTP for iOS) without touching app code.

```ts
// packages/audio-engine/src/types.ts (shape, not final API)
interface PlaybackEngine {
  load(queue: QueueItem[], startIndex: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  setQueue(queue: QueueItem[]): Promise<void>;
  getState(): PlaybackState; // snapshot
  subscribe(listener: (state: PlaybackState) => void): () => void; // unsubscribe
}
```

The mobile app consumes this through a Zustand store that wraps
`PlaybackEngine`, so components read reactive state (`currentTrack`,
`positionMs`, `isPlaying`, `queue`) without knowing an engine exists
underneath.

## Native implementation shape (Android)

- **Expo config plugin** registers the native module and required Android
  manifest entries (foreground service, notification permissions) so the
  app remains buildable via `expo prebuild`/EAS without manual native
  project edits.
- **Foreground `MediaSessionService`** (Kotlin) hosts an ExoPlayer instance,
  handles lock-screen/notification controls, and survives app backgrounding
  — this is the standard, correct pattern for Android background audio
  (confirmed against current Android media architecture guidance).
- **Bridge layer** exposes the `PlaybackEngine` methods to JS via Expo
  Modules API (events for state changes, not polling).
- **Queue management** lives natively (ExoPlayer's own playlist/queue
  primitives) so skip/next/gapless behavior is handled by the platform
  media stack rather than reimplemented in JS.

## What this buys us vs. RNTP

- No recurring licensing cost, no vendor lock to a package whose license
  terms can change again.
- Full control over queue behavior, caching strategy, and notification UI —
  useful for the "intelligent, original" product goals (e.g. custom
  notification actions, dynamic accent-color art integration).
- A genuine, demonstrable piece of native engineering work in the
  portfolio.

## What this costs us

- We own bugs that a mature library would otherwise have already fixed
  (buffering edge cases, Bluetooth route changes, Android OEM background
  restrictions on Doze/battery optimization).
- iOS support is not automatic — a separate AVPlayer-backed implementation
  behind the same `PlaybackEngine` interface will be needed when iOS
  support is prioritized. The interface is designed for this; the
  implementation is deferred.
- Real device testing is required; emulator-only testing does not surface
  the background/Doze issues that matter most.

## Phase placement

This is built in **Phase 5** (Audio playback engine), after the design
system and basic catalog/library screens exist, so there's a real UI to
integrate it into and real track data to play.
