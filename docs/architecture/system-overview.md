# System Overview

**Status: current as of Phase 6.2 (2026-07-20).** This document is the
entry point for understanding what ENIZA is and how its major pieces fit
together. It supersedes the product-model framing previously spread across
`overview.md`, `content-model.md`, and `catalog-and-library.md` — those
three documents are kept for historical context (each is marked
"superseded" at the top) but this file, `backend-architecture.md`,
`mobile-architecture.md`, `module-dependencies.md`, and
`playback-engine.md` are the current source of truth going forward.

## What this is

ENIZA is an original, premium music streaming client — Android-first,
built with React Native/Expo and a NestJS backend. It is **not** a clone
of any existing streaming product; those products are studied only for
general usability principles, never copied for layout, navigation,
branding, or workflow. Branding, visual identity, and screen layouts are
frozen per **Branding Assets v1.0** (see
[`branding/branding-v1.md`](../branding/branding-v1.md)) and the approved
Design System (see [`design/design-system-specification.md`](../design/design-system-specification.md))
— see "Project Standards" in [`../README.md`](../README.md) for what
"frozen" means in practice.

## Product model

The backend never hosts audio or lets users publish tracks. Music
discovery and playback are delegated to an external `MusicProvider` behind
a `MusicGateway` abstraction; the backend owns everything user-specific —
auth, users, playlists, library, favorites, listening/search history,
recommendations, and (once Phase 6.3 lands) settings — plus a local
metadata cache of provider responses. See
[`decisions/0007-provider-backed-music-catalog.md`](../decisions/0007-provider-backed-music-catalog.md)
and [`music-provider-architecture.md`](./music-provider-architecture.md)
for the full design.

The primary user flow is:

```
Open App → (personalized) Home ⇄ Search → Results → Tap Track → Immediate Playback
```

Home is the personalized landing page (recommendations, recently played,
your playlists); Search/Explore is a permanent, first-class way to find
something specific. Neither replaces the other.

## High-level architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│        apps/mobile           │        │           apps/api            │
│   Expo / React Native        │        │       NestJS (modular         │
│                               │  HTTP  │        monolith)              │
│  expo-router screens          │───────▶│                                │
│  Zustand stores                │◀──────│  auth · users · catalog       │
│  TanStack Query                │        │  discovery · library          │
│  packages/audio-engine         │        │  playback · recommendations   │
│  (native ExoPlayer module)     │        │  queue                        │
└──────────────┬────────────────┘        └───────────┬───────────────────┘
               │                                       │
               │ plays stream URLs                     │ Postgres (Drizzle)
               │ resolved by /playback                 │ Redis (BullMQ + cache)
               ▼                                       ▼
     Device audio hardware              MusicProvider adapter (e.g. Jamendo)
                                          — the only thing outside our
                                            control; everything else above
                                            is code in this repository.
```

## Monorepo structure

Managed with pnpm workspaces + Turborepo. Full detail (dependency
direction, task graph, versioning approach) is in
[`monorepo-structure.md`](./monorepo-structure.md); summarized here:

```
eniza/
├── apps/
│   ├── mobile/     # Expo app — see mobile-architecture.md
│   └── api/        # NestJS backend — see backend-architecture.md
├── packages/
│   ├── shared-types/    # DTOs shared between mobile and api
│   ├── design-system/   # Design tokens + themed primitives (frozen v1.0)
│   ├── audio-engine/    # PlaybackEngine contract + Android implementation
│   ├── api-client/      # Typed fetch layer built on shared-types
│   └── config/          # Shared tsconfig/eslint/prettier bases
├── assets/          # Branding Assets v1.0 (frozen — see branding/branding-v1.md)
├── docs/            # This documentation
├── docker-compose.yml  # Local Postgres/Redis/MinIO
└── (no .github/workflows yet — tracked as Phase 6.4)
```

See [`module-dependencies.md`](./module-dependencies.md) for the full
package/module dependency graph (which package imports which, and the
rule that nothing in `packages/` ever imports from `apps/`).

## Backend modules (summary — full detail in `backend-architecture.md`)

| Module | Owns |
|---|---|
| `auth` | Registration, login, JWT access + rotating refresh tokens, session/device tracking, email OTP verification, forgot/reset password |
| `users` | Minimal profile data (`GET /users/me`) |
| `catalog` | The local metadata cache tables (`artists`/`albums`/`tracks`) and their upsert/refresh logic; single-entity lookups by id |
| `discovery` | `MusicGateway`, `MusicProvider` adapters (Jamendo + `MockProvider`), `GET /search` |
| `library` | A user's playlists, likes, and follows (ownership-scoped) |
| `playback` | Stream URL resolution + `listening_history` writes |
| `recommendations` | Behavioral-first recommendation sections backing Home |
| `queue` | BullMQ (or an inline in-process fallback) for background metadata refresh jobs |

## Mobile architecture (summary — full detail in `mobile-architecture.md`)

Expo Router screens (onboarding → auth → tab shell → detail/player
screens), Zustand for client-owned state (`auth`, `playback`,
`sleep-timer`, `onboarding`), TanStack Query for all server state, and
`packages/audio-engine` for native playback — wrapped in a thin
`usePlaybackStore`.

## Shared packages (summary — full detail in `module-dependencies.md`)

- **`shared-types`** — the compile-time contract both `apps/api` and
  `apps/mobile` build against; a backend DTO that drifts from it fails to
  compile.
- **`design-system`** — the single source of visual truth (tokens, theme,
  primitives). Frozen per Branding Assets v1.0 / the approved Design
  System spec — see "Project Standards" in `../README.md`.
- **`audio-engine`** — the `PlaybackEngine` platform-abstraction contract,
  plus its first real implementation, `AndroidPlaybackEngine`. See
  [`playback-engine.md`](./playback-engine.md) for the full pipeline.
- **`api-client`** — typed `fetch` wrapper, one client class per backend
  module (`AuthClient`, `CatalogClient`, `LibraryClient`, `PlaybackClient`,
  `RecommendationsClient`, `SearchClient`).
- **`config`** — shared tsconfig/eslint/prettier bases.

## Key flows

### Authentication flow

1. `POST /auth/register` creates a user (`emailVerified: false`) and
   issues tokens immediately, but every protected mobile route group
   additionally checks `emailVerified` (see `(tabs)/_layout.tsx`) and
   redirects to `verify-otp` if it's false — an authenticated-but-
   unverified account cannot reach the tab shell.
2. `POST /auth/verify-otp` marks the account verified. `POST
   /auth/resend-otp` re-sends, throttled by a cooldown the mobile
   `ResendCountdown` component mirrors (30s).
3. `POST /auth/login` issues a JWT access token (short-lived) + a rotating
   refresh token. `packages/api-client`'s `HttpClient` retries exactly once
   on a 401 by calling `/auth/refresh` and replaying the original request;
   concurrent 401s share one in-flight refresh call rather than each
   independently rotating the token (see `decisions/0005-auth-token-strategy.md`
   for why independent concurrent rotations would break replay detection).
4. `POST /auth/forgot-password` → `POST /auth/forgot-password/verify` →
   `POST /auth/reset-password` mirrors the OTP flow for account recovery;
   a successful reset revokes all of the user's existing sessions.
5. Mobile: tokens live exclusively in `expo-secure-store` (two separate
   keys, never one JSON blob); `useAuthStore` (Zustand, not persisted)
   holds only the in-memory profile, re-fetched via `bootstrap()` on every
   cold start. Routing between signed-out/unverified/signed-in states uses
   Expo Router's `Stack.Protected`.

### API flow (a typical read, e.g. Search)

```
Mobile (Explore screen)
  → SearchClient.search(query)          [packages/api-client]
    → GET /search?q=...                 [apps/api discovery/search.controller.ts]
      → SearchService                   [checks Redis response cache]
        → MusicGateway                  [checks Postgres metadata cache]
          → MusicProvider (Jamendo)     [only on cache miss]
        ← normalized Track/Album/Artist DTOs, upserted into the cache
      ← search_history row written (fire-and-forget)
    ← JSON response, typed against @music-app/shared-types
  ← TanStack Query cache
```

### Data flow (write path, e.g. liking a track)

```
Mobile (TrackRow / RecommendationCard)
  → LibraryClient.save({ entityType: 'track', entityId })
    → POST /library/saved                [apps/api library/library.controller.ts]
      → LibraryEntriesService            [JwtAuthGuard-scoped to the requesting user]
        → INSERT into library_entries    [Postgres, via Drizzle]
    ← 201
  ← TanStack Query invalidates the affected query keys (e.g. "is this track liked")
```

### Recommendation pipeline

`GET /recommendations` → `RecommendationsService` computes independent
sections, each omitted (not returned empty) when there isn't enough data:

1. **Continue listening** — tracks with ≥15s of `listening_history`
   progress that aren't `completed`/`skipped`.
2. **Recently played** — most recent `listening_history` rows.
3. **For you** — the user's most-listened-to artist, other cached tracks
   by that artist.
4. **Because you liked "X"** — the user's most recently liked track,
   enriched via `MusicGateway.getRelatedTracks` if the active provider
   supports it (degrades gracefully to omission if not).
5. **Trending now** — a cross-user play-count aggregate over the last 30
   days; the one non-personalized section, so a brand-new user always sees
   something.

Provider data is a secondary, optional enrichment signal — recommendations
work from behavioral data alone if the provider doesn't support
`getRelatedTracks`. See `music-provider-architecture.md`'s "Recommendation
architecture" section for the full reasoning.

### Audio playback pipeline

See [`playback-engine.md`](./playback-engine.md) for the complete,
currently-accurate pipeline (tapping a track → building a queue →
resolving stream URLs → native ExoPlayer playback → state syncing back to
the UI).

## Target platforms

- **Primary, and the only one built today:** Android (phone).
- **Planned, not yet started:** iOS (tracked as Phase 6.7 — the
  `PlaybackEngine` contract in `packages/audio-engine` was designed for
  this from the start, but no AVPlayer-backed implementation exists yet).
- **Future, no committed timeline:** tablet, desktop, web. The
  architecture (Expo, a decoupled design-system package, a
  platform-abstracted audio engine interface) is chosen so these can be
  added without re-architecting, but no code for them exists.

## Explicit non-goals (unchanged from the original brief)

- Enterprise-scale infrastructure (multi-region, autoscaling groups).
- Payment processing / monetization.
- Real DRM.

## Technical Debt

This is the canonical technical-debt register for the project. Anything
listed here is a known, intentional gap — not an oversight discovered
later — and should be read before starting any new phase, since several
items directly gate or constrain upcoming work.

### Known limitations

- **Single-platform audio engine.** `packages/audio-engine`'s
  `PlaybackEngine` contract has only an Android (Media3/ExoPlayer)
  implementation. There is no `ios/` native project anywhere in the repo.
  Any iOS build today would fail at the native module layer — this is not
  a "port," it would be a from-scratch implementation. Tracked as Phase
  6.7.
- ~~**Dev-only OTP delivery.**~~ **Resolved in Phase 6.2.**
  `EmailOtpProvider` (`apps/api/src/auth/otp/email-otp-provider.ts`) sends
  real OTP emails over SMTP via Nodemailer, selected automatically when
  `SMTP_HOST` is configured. `ConsoleOtpProvider`
  (`apps/api/src/auth/otp/console-otp-provider.ts`) remains in place as
  the local-dev/test fallback when no SMTP config is present — this is by
  design, not a remaining gap.
- **No CI/CD pipeline.** No `.github/workflows` directory exists. Every
  merge today relies entirely on whoever is merging having run
  `turbo run lint/typecheck/test` (and `apps/api`'s `test:e2e`) locally.
  Tracked as Phase 6.4.
- **`settings` table has no consumer.** `apps/api/src/database/schema/settings.schema.ts`
  (`explicitContentEnabled`, `autoplayEnabled`) exists with no backend
  module and no mobile screen using it yet. Tracked as Phase 6.3.
- **No offline/downloads support.** No on-device SQLite schema, no
  download manager, no offline playback fallback. Tracked as Phase 6.6.
- **No automated accessibility testing.** WCAG conformance requires manual
  testing with assistive technology; no automated a11y checks exist in the
  current test suites. Tracked as part of Phase 6.5.
- **No rate limiting on public endpoints.** `GET /search` in particular
  proxies to a rate-limited external provider with no application-level
  throttling of its own yet. Tracked as part of Phase 6.5.

### Deferred features

These are explicitly out of scope until a product decision re-introduces
them — not because they're technically hard, but because they were never
committed scope for the initial release (see "Explicit non-goals" above
and Phase 0's decision record):

- **Social features** — user-to-user following, activity feed, sharing to
  other users. Only content-following exists today (artist/album/playlist
  likes via the polymorphic `library_entries` table), which is not
  user-to-user social.
- **Monetization / subscriptions** — no schema, no backend module, no
  mobile payment/IAP library installed.
- **Admin / CMS tooling** — no human content-curation surface exists;
  content comes entirely from `discovery`'s automated provider adapters
  and background refresh jobs.
- **Push / in-app notifications** — no `expo-notifications` dependency, no
  backend module, no device-token storage. Reconfirm scope before
  scheduling (currently Phase 6.9, low–medium priority).

### Risks

- **Offline downloads and iOS parity both touch the native audio engine.**
  Because the engine is Android-only today, building offline support
  either ships Android-only first (widening the platform gap) or waits on
  iOS parity landing first. This should be an explicit product decision
  before Phase 6.6/6.7 start, not an implicit one.
- **Recommendations depend on `listening_history` being populated
  correctly.** Any future change to playback-progress reporting cadence
  (`use-report-playback-progress.ts`) could silently degrade
  recommendation quality (e.g. the "continue listening" and "trending"
  sections) without producing an obvious error.
- **Documentation drift.** This is the second time project documentation
  has been found meaningfully behind the actual codebase (`roadmap.md`'s
  status log previously predated the Phase 4.5/5 work; `audio-engine.md`
  and `backend-architecture.md` both still describe pre-implementation
  states as current). Phase 6.1 established a synchronization step
  precisely to catch this going forward — see
  [ADR 0009](../decisions/ADR-0009-phase6-roadmap.md) — but the underlying
  risk (docs written once at design time and not revisited at completion
  time) is a process risk that recurs unless every phase's completion
  criteria explicitly includes a documentation update, not just working
  code.

### Future improvements

- Real device (not emulator-only) verification of the Android playback
  engine's background/Doze behavior — emulator testing does not surface
  the OEM background-restriction issues that matter most for a
  foreground-audio app (see `playback-engine.md`).
- A second `MusicProvider` adapter, now that the registry-based
  `MusicGateway` design supports one additively (see
  `music-provider-architecture.md`), to fill catalog gaps the current
  provider has.
- Revisit the TypeScript 7.0 ("tsgo") pin exception once ecosystem
  compatibility (Nest CLI, Expo, Metro, ESLint tooling) catches up — see
  `tech-stack.md`'s "Explicitly rejected / deferred" section.
