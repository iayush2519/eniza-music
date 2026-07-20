# Playback Engine

**Status: current as of Phase 6.1 (2026-07-20).** This document
supersedes `audio-engine.md`, which described the engine as a design with
no implementation yet ("no implementation of this interface exists yet"
was accurate when written, during Phase 0/early Phase 5, but is **not**
accurate today — `audio-engine.md` itself, and the header comments inside
`packages/audio-engine/src/playback-engine.ts` and `types.ts`, are stale
on this point and should be read as historical design rationale, not
current status). This document describes the actual, current
implementation.

## Decision (unchanged from ADR 0002)

A custom native audio engine on **Android Media3/ExoPlayer**, wrapped in a
clean TypeScript abstraction, rather than react-native-track-player
(RNTP). See [`decisions/0002-custom-audio-engine-over-rntp.md`](../decisions/0002-custom-audio-engine-over-rntp.md)
for the full reasoning. This decision is not under review.

## The `PlaybackEngine` contract (`packages/audio-engine/src/playback-engine.ts`)

```ts
interface PlaybackEngine {
  load(queue: QueueItem[], startIndex: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  setQueue(queue: QueueItem[]): Promise<void>;
  setRepeatMode(mode: RepeatMode): Promise<void>;
  setShuffleEnabled(enabled: boolean): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  reorderQueue(fromIndex: number, toIndex: number): Promise<void>;
  getState(): PlaybackState;
  subscribe(listener: (state: PlaybackState) => void): () => void;
}
```

The rest of the app (UI, state, navigation) never talks to ExoPlayer, a
`MediaSession`, or any native API directly — only to this interface. This
is the seam that will let an iOS (AVPlayer-backed) implementation be added
later (Phase 6.7) without touching app code, and it is why the contract
was written and stabilized before any implementation existed.

Queue navigation, repeat, and shuffle are deliberately owned by the
native engine's own playlist primitives, not reimplemented in JS —
`skipToNext`/`setRepeatMode`/`reorderQueue` are commands the engine
executes on its own playlist state, not JS-side index arithmetic the
caller performs. This applies equally to `reorderQueue`, which delegates
to ExoPlayer's own `moveMediaItem` rather than rebuilding the whole queue
via `setQueue` (which would otherwise reset playback position).

## Current implementation: `AndroidPlaybackEngine`

`packages/audio-engine/src/android-playback-engine.ts` is the first, and
currently only, concrete `PlaybackEngine` implementation. It is backed by
a Kotlin native module at
`packages/audio-engine/android/src/main/java/expo/modules/audioengine/`,
registered via the Expo Modules API (`expo-module.config.json`).

Responsibilities split between JS and native:

- **JS side (`AndroidPlaybackEngine`)** keeps queue *metadata*
  (title/artist/artwork) indexed by position, since the native side only
  ever receives `trackId`/`streamUrl` per queue item — this class is what
  reunites a native state snapshot's `currentIndex` with the rest of a
  `QueueItem`'s metadata for `getState()`/`subscribe()` callers. It also
  mirrors `reorderQueue`'s effect locally (before awaiting the native
  call) and proactively notifies listeners, so the UI doesn't wait for
  some *other* native event to happen to fire next — e.g. while paused,
  nothing would otherwise trigger a refresh, silently desyncing the UI
  from the just-reordered queue.
- **Native side (Kotlin, ExoPlayer)** owns actual playback: a foreground
  `MediaSessionService` hosts an ExoPlayer instance, handles lock-screen/
  notification controls, survives app backgrounding, and owns queue
  navigation/repeat/shuffle/gapless behavior via ExoPlayer's own
  primitives (`Player.REPEAT_MODE_*`, `shuffleModeEnabled`,
  `setPlaybackSpeed`, `moveMediaItem`).
- Defensive normalization (`normalizeStatus`, `normalizeRepeatMode` in
  `android-playback-engine.ts`) guards against a native/JS contract drift
  (e.g. a status-string typo on the Kotlin side) surfacing as a runtime
  crash deep in a UI render — it falls back to a safe default (`'error'`
  for status, `'off'` for repeat mode) instead.

### State shape (`PlaybackState`)

```ts
interface PlaybackState {
  queue: QueueItem[];
  currentIndex: number;
  positionMs: number;
  status: PlaybackStatus;   // 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'
  error: string | null;
  repeatMode: RepeatMode;   // 'off' | 'one' | 'all'
  shuffleEnabled: boolean;
  playbackRate: number;     // 1.0 = normal speed
  volume: number;           // 0 (silent) – 1 (full), the app's own in-player volume, distinct from device hardware volume
}
```

### Stream URL resolution (`stream-resolver.ts`)

A `QueueItem`'s `streamUrl` starts `null` and is resolved lazily against
`GET /playback/resolve/:trackId` (`apps/api/src/playback/playback.controller.ts`)
via `resolveQueueItemStream` — a provider's stream URL can be short-lived
and shouldn't be resolved before it's actually needed. The dependency this
function needs (`resolveStreamUrl(trackId)`) is satisfied structurally by
`@music-app/api-client`'s `PlaybackClient` without `audio-engine`
depending on `api-client` directly — see
[`module-dependencies.md`](./module-dependencies.md).

## The full pipeline: tap a track → hear audio

```
1. User taps a TrackRow / RecommendationCard / album track list item
2. apps/mobile: lib/play-queue.ts builds a QueueItem[] from context
   (album, playlist, or search results), each item's streamUrl: null
3. usePlaybackStore (stores/playback-store.ts) calls engine.load(queue, startIndex)
4. AndroidPlaybackEngine.load():
   a. stores queue metadata in JS
   b. calls native.loadQueue(...) with trackId/streamUrl per item
5. Kotlin native module (AudioEngineModule + MediaSessionService):
   a. for each item without a resolved streamUrl, triggers resolution via
      stream-resolver.ts → PlaybackClient.resolveStreamUrl(trackId)
        → GET /playback/resolve/:trackId (backend)
          → PlaybackService → MusicGateway.resolveStreamUrl(providerId, externalId)
            → MusicProvider adapter (e.g. Jamendo)
          ← stream URL (possibly short-TTL)
        ← listening_history row written (fire-and-forget)
   b. hands the resolved URL(s) to ExoPlayer
   c. ExoPlayer begins buffering/playback; MediaSessionService surfaces
      lock-screen/notification controls
6. Native emits onPlaybackStateChanged events as ExoPlayer's state changes
7. AndroidPlaybackEngine's native.addListener callback updates
   latestNativeState and notifies JS-side subscribers
8. usePlaybackStore re-renders; MiniPlayer / Full Player / Queue sheet
   reflect the new state
9. use-report-playback-progress.ts periodically calls
   POST /playback/progress (position, on pause/track-change/end),
   updating listening_history.durationListenedSeconds/completed/skipped —
   the write side the recommendations pipeline's "continue listening" and
   "trending" sections depend on
```

## What this buys us vs. RNTP (unchanged from `audio-engine.md`)

- No recurring licensing cost, no vendor lock to a package whose license
  terms can change again (RNTP v5 became commercially licensed — see ADR
  0002).
- Full control over queue behavior, notification UI, and future
  dynamic-accent-color art integration.
- A genuine, demonstrable piece of native engineering work.

## What this costs us (unchanged from `audio-engine.md`, still true)

- We own bugs a mature library would otherwise already have fixed
  (buffering edge cases, Bluetooth route changes, Android OEM background
  restrictions on Doze/battery optimization).
- **iOS support is not automatic.** A separate AVPlayer-backed
  implementation behind the same `PlaybackEngine` interface is required —
  tracked as Phase 6.7. The interface is designed for this; the
  implementation does not exist yet.
- Real device testing is required for background/Doze behavior;
  emulator-only testing does not surface the issues that matter most. No
  real-device verification of background/Doze behavior has been recorded
  in this project's documentation to date — flagged as an open
  verification gap, not assumed covered.

## Technical debt specific to the playback engine

See [`system-overview.md`](./system-overview.md)'s Technical Debt section
for the canonical register. Playback-specific highlights:

- No iOS implementation — Phase 6.7.
- No offline/cached-audio fallback — Phase 6.6; will need a decision on
  whether it's built Android-only first or waits for iOS parity (see
  `system-overview.md`'s "Risks").
- No recorded real-device background/Doze verification.
