# iOS Deployment

**Status: current as of Phase 6.1 (2026-07-20).** New document. **iOS has
no work done on it at all** — this document exists to state that clearly
and to describe what's required before any iOS build could be attempted,
not to describe a working process.

## Current state: nothing built, nothing runnable

- No `ios/` native project directory exists anywhere in the repo (Expo
  generates this on demand via `expo prebuild --platform ios`, same as
  Android, but it has never been run for this project).
- `packages/audio-engine` has **no iOS implementation** of the
  `PlaybackEngine` interface. `packages/audio-engine/android/` exists;
  there is no sibling `ios/` directory. Attempting to run the mobile app
  on iOS today would fail as soon as any code tried to construct a
  playback engine, since `lib/playback-engine.ts` currently always
  resolves to `AndroidPlaybackEngine`.
- No Apple Developer account, provisioning profile, or signing
  configuration exists in this project's scope.
- No EAS Build iOS profile exists (no `eas.json` at all — see
  [`android.md`](./android.md)).

## What would be required before iOS is viable

1. **Phase 6.7 — iOS playback engine parity.** An AVPlayer-backed
   implementation of `PlaybackEngine`
   (`packages/audio-engine/src/playback-engine.ts`), satisfying the exact
   same interface `AndroidPlaybackEngine` does — see
   [`../architecture/playback-engine.md`](../architecture/playback-engine.md).
   This is the blocking prerequisite; nothing else below matters until
   this exists, since the app cannot play audio on iOS without it.
2. Running `expo prebuild --platform ios` to generate the native project,
   and verifying the Expo config plugin approach used for Android's
   native module registration has an iOS equivalent wired up.
3. A macOS build environment (Xcode) — not available in every development
   environment this project has been worked in; this is a real
   environment constraint, not just a scheduling one.
4. Apple Developer Program enrollment, signing certificates, and
   provisioning profiles, if any device testing or TestFlight distribution
   is intended.
5. Re-verification of every screen/flow already built for Android against
   iOS-specific platform differences (safe-area insets, gesture
   conflicts, native module behavior) — the design system and app code
   are written platform-generically, but this has not been exercised on
   iOS even once.

## Explicit non-decision

Whether iOS ships at all, and on what timeline, is a product-scope
question, not purely a technical one — see `system-overview.md`'s
"Explicit non-goals" (iOS was named as a "future" target from Phase 0, not
a committed one). This document does not make that decision; it only
describes what's required if/when it's made. Phase 6.7 in
[`../roadmap.md`](../roadmap.md) is currently Medium priority based on the
Phase 6.0 planning review, not a confirmed release commitment.
