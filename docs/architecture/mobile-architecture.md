# Mobile Architecture

**Status: current as of Phase 6.1 (2026-07-20).** This document describes
the actual, current shape of `apps/mobile`. It is a new document — the
mobile app's structure was previously described piecemeal across
`catalog-and-library.md` (auth UI, routing) and `state-management.md`
(state layering rules), neither of which reflected the screens/stores that
exist today. This file consolidates and updates that into one accurate
picture; `state-management.md`'s state-layering *rules* remain the
authority for how state should be categorized (unchanged), while this
document describes what actually exists.

## Screen structure (Expo Router, `src/app/`)

```
src/app/
├── _layout.tsx              # Root: Stack.Protected route guarding
├── splash.tsx                # Shown until auth bootstrap completes
├── onboarding.tsx
├── (auth)/                   # Signed-out route group
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── verify-otp.tsx             # Shared by register + password-reset flows
├── auth-result.tsx            # Shared success/error confirmation screen
├── (tabs)/                    # Signed-in, email-verified route group
│   ├── _layout.tsx
│   ├── index.tsx               # Home — curated feed / recommendations
│   ├── explore.tsx             # Search
│   └── library.tsx              # Playlists / Albums / Artists (SegmentedControl)
├── album/[id].tsx
├── artist/[id].tsx
├── playlist/[id].tsx
├── player.tsx                  # Full Player
├── lyrics.tsx
└── (queue and sleep-timer are sheets, not routes — see components/)
```

### Routing: `Stack.Protected`

The root layout gates route groups behind boolean guards using Expo
Router's `Stack.Protected` API — three states: not-yet-bootstrapped
(`splash`), signed-out (`(auth)`), signed-in (`(tabs)`). Email
verification is enforced as a fourth, narrower check inside
`(tabs)/_layout.tsx` (a redirect effect to `verify-otp` if
`emailVerified` is false), not in the root guard — putting it in the root
guard was tried first and raced against the `auth-result` confirmation
screen, redirecting away before it could render. See
`decisions/0006-mobile-route-guarding.md` for why `Stack.Protected` was
chosen over a hand-rolled `useSegments()` + `<Redirect>` approach.

## State layering (rules unchanged from `state-management.md`; inventory below is current)

| Kind of state | Tool | Current instances |
|---|---|---|
| Server state | TanStack Query | Search results, recommendations, playlists, library entries, album/artist detail — every network-fetched value |
| Ephemeral/persisted client state | Zustand | `useAuthStore` (in-memory profile, not persisted), `usePlaybackStore` (wraps `PlaybackEngine`), `useSleepTimerStore`, `useOnboardingStore` |
| Secrets | `expo-secure-store` | Access + refresh tokens (two separate keys) |
| Live playback state | `packages/audio-engine`'s event stream, surfaced through `usePlaybackStore` | Current position, `isPlaying`, buffering, repeat/shuffle/rate/volume |

**Not yet in use:** MMKV (persisted Zustand middleware) and on-device
SQLite are both named in `tech-stack.md`/`state-management.md` as the
intended tools for persisted UI prefs and offline relational data
respectively, but neither is a dependency in `apps/mobile/package.json`
today. Offline downloads (Phase 6.6) will be the first feature to actually
need SQLite; a settings screen (Phase 6.3) may be the first to need MMKV,
depending on whether preferences end up server-owned (via the future
`settings` module) or purely local. This is a real gap between the stated
state-management plan and current dependencies, not a silent
simplification — flagged here so Phase 6.3/6.6 don't assume the tooling is
already wired up.

## Stores (`src/stores/`)

- **`auth-store.ts`** — `bootstrap()`, `login`, `register`, `logout`,
  `verifyOtp`, `resendOtp`, `forgotPassword`, `verifyPasswordResetOtp`,
  `resetPassword`. Not persisted; the profile is re-fetched from the
  backend on every cold start via `bootstrap()`. Unit-tested
  (`auth-store.spec.ts`, 19 scenarios).
- **`playback-store.ts`** — wraps `packages/audio-engine`'s
  `PlaybackEngine`; exposes `currentTrack`, `positionMs`, `isPlaying`,
  `queue`, `repeatMode`, `shuffleEnabled`, `playbackRate`, `volume`, plus
  actions including `cycleRepeatMode` (a UI-convenience wrapper around
  `setRepeatMode`). Unit-tested (`playback-store.spec.ts`).
- **`sleep-timer-store.ts`** — sleep timer countdown/state, persisted
  across navigation (not across app restarts). Unit-tested
  (`sleep-timer-store.spec.ts`).
- **`onboarding-store.ts`** — whether onboarding has been seen; backed by
  `lib/onboarding-storage.ts`.

## Hooks (`src/hooks/`)

`use-album-saved`, `use-artist-followed`, `use-track-liked`,
`use-saved-entities` (shared logic behind the three above),
`use-new-releases` (paginated), `use-artist-name-map` (resolves an
`artistId` to a display name client-side, since `Track` intentionally
carries only the id), `use-report-playback-progress` (mounted once at the
app root; reports position to `POST /playback/progress` periodically and
on pause/track-change/end — extracted as a plain, directly-testable
function since this project's test setup has no React-hook-rendering
utility; unit-tested, `use-report-playback-progress.spec.ts`).

## Library (`src/lib/`)

`api-client.ts` (wraps `@music-app/api-client` with the app's token
store), `secure-token-store.ts` (the `expo-secure-store` adapter),
`play-queue.ts` (builds a `QueueItem[]` from a tapped track's context —
album, playlist, or search results), `playback-engine.ts` (constructs the
active `PlaybackEngine` — currently always `AndroidPlaybackEngine`),
`query-client.ts` (the shared TanStack `QueryClient`), `format.ts`
(duration/date formatting helpers), `greeting.ts` (time-of-day-aware Home
greeting; unit-tested), `onboarding-storage.ts`.

## Components (`src/components/`)

Feature components built on `packages/design-system` primitives:
`album-card`, `artist-card`, `playlist-card`, `recommendation-card`,
`track-row`, `mini-player`, `queue-sheet`, `sleep-timer-sheet`, `header`,
`quick-actions`, `new-releases-section`, `onboarding-slide`,
`progress-dots`, `otp-input` (single hidden `TextInput` driving N visual
boxes, so OS paste works naturally), `resend-countdown`,
`auth-brand-header`, `auth-text-field`, `text-field`, `app-tabs` (+
`app-tabs.web.tsx` variant for web).

## Data layer: what each screen fetches

| Screen | Query | Auth required |
|---|---|---|
| Home (`(tabs)/index.tsx`) | `GET /recommendations` (sections) + paginated new releases | Yes |
| Explore (`(tabs)/explore.tsx`) | `GET /search` | No (screen itself sits behind the tab shell, but the query has no auth requirement) |
| Library (`(tabs)/library.tsx`) | `GET /library/saved` (Playlists/Albums/Artists via `SegmentedControl`) | Yes |
| Album/Artist/Playlist detail | Single-entity lookups by id | No |
| Full Player / Queue / Lyrics | Reads `usePlaybackStore` directly, no network fetch of its own | N/A |

`useArtistNameMap` backs artist-name resolution on Home and Explore, since
`Track` carries only `artistId` — denormalizing the name onto every track
response would duplicate data that's cheap to join client-side at this
catalog size.

## Native module boundary

`apps/mobile` never talks to ExoPlayer or any native playback API
directly — it depends only on `packages/audio-engine`'s `PlaybackEngine`
interface via `usePlaybackStore`. See
[`playback-engine.md`](./playback-engine.md) for the full pipeline.

## Technical debt specific to mobile

See [`system-overview.md`](./system-overview.md)'s Technical Debt section
for the canonical register. Mobile-specific highlights:

- No settings screen exists (Phase 6.3).
- No offline/download UI exists (Phase 6.6).
- MMKV and on-device SQLite are named in the state-management plan but not
  yet installed — see "State layering" above.
- No push-notification handling (`expo-notifications` is not a dependency)
  — Phase 6.9, scope to be reconfirmed.
