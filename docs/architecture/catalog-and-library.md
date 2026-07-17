# Catalog & Library Domain (Phase 4)

> **Partially superseded.** This document was written when `catalog`
> modeled an owned, upload-based content catalog. That model changed —
> see [`decisions/0007-provider-backed-music-catalog.md`](../decisions/0007-provider-backed-music-catalog.md)
> and [`music-provider-architecture.md`](./music-provider-architecture.md)
> for the current design. The sections below on **schema shape** and
> **what each screen fetches** describe the retired model and are kept for
> history; everything about the **library module's ownership pattern**,
> **shared-types/api-client structure**, **auth UI**, and **routing**
> below is still accurate and unchanged by the pivot.

This documents the concrete implementation of the `catalog` and `library`
modules described at a high level in `content-model.md` and
`backend-architecture.md`, plus the mobile-side consumption layer
(`packages/api-client`, TanStack Query, and the minimal auth UI needed to
reach authenticated library screens).

## Schema shape *(as originally built — see `music-provider-architecture.md` for the current shape)*

Six tables, all in `apps/api/src/database/schema/`: `artists`, `albums`,
`tracks`, `playlists`, `playlist_tracks`, `library_entries`. Three shape
decisions are worth calling out because they weren't the simplest option
— and all three turned out to still hold under the provider pivot, which
is why the tables were kept rather than dropped:

### `library_entries` is one polymorphic table, not three

A user's liked tracks, liked albums, and followed artists are all rows in a
single `library_entries` table, distinguished by an `entityType` enum
(`'track' | 'album' | 'artist'`) plus an untyped `entityId`. The alternative
— three separate tables (`liked_tracks`, `liked_albums`, `followed_artists`)
— would need every "does the current user have X saved" and "give me the
current user's whole library" query to hit three tables and merge results.
Since the access pattern is identical regardless of entity kind, one table
with a discriminator is the simpler design. The cost: `entityId` has no
foreign key (Postgres has no native polymorphic FK), so referential
integrity for that column is enforced in `LibraryService`, not the DB.
This is an explicit, accepted tradeoff, not an oversight.

### `playlist_tracks.position` is a real column, not insertion order

Reordering a playlist is a single-row `UPDATE`, not a full rewrite of the
join table. A unique index on `(playlistId, trackId)` also makes "a track
can only appear once per playlist" a DB-level guarantee rather than an
application-level check that could race.

### `tracks` carries `sourceKind` and `licenseType` enums with one value each

Per `content-model.md`'s original "design for a future licensed provider"
section, both enums existed from the start (`sourceKind: 'upload'`,
`licenseType: 'artist_direct'`) even though only one value was ever written
in Phase 4. This is the one piece of foresight that paid off directly: the
provider pivot needed a place to record which external source a cached row
came from, and this enum (now joined by explicit `providerId`/`externalId`
columns — see `music-provider-architecture.md`) was already there.

## Backend module boundaries *(as originally built)*

- **`catalog`** — public, read-only. `CatalogController` has no
  `JwtAuthGuard`; browsing tracks/albums/artists never requires an
  account, per `content-model.md`. Under the provider model, this
  "browse everything" controller surface is retired (there's no owned
  catalog to enumerate) in favor of `search`; single-entity lookups by id
  survive as reads against the metadata cache.
- **`library`** — authenticated, ownership-scoped. Every `LibraryController`
  route is behind `JwtAuthGuard`, and every service method takes the
  requesting user's id and filters by it — there is no code path that lets
  one user read or mutate another user's playlists or saved entries. **This
  module and its ownership pattern are unchanged by the provider pivot.**

Response DTOs (`TrackResponseDto`, `PlaylistResponseDto`, etc.) each
`implements` the matching type in `packages/shared-types`. This means a
DTO that drifts from the shared contract (a renamed field, a changed
nullability) fails to compile — the drift is caught at build time on the
backend, not discovered later as a runtime mismatch on the client.

## `packages/shared-types` and `packages/api-client`

**Unchanged by the provider pivot** — this structure and discipline
carries forward as-is; only the *content* of the `Track`/`Album`/`Artist`
types and the catalog-facing client methods change (see
`music-provider-architecture.md`). Two new packages, both consumed by both
`apps/api` and `apps/mobile`:

- **`shared-types`** — domain types (`Track`, `Album`, `Artist`,
  `Playlist`, `PlaylistWithTracks`, `LibraryEntry`, `UserProfile`) and
  request types (`LoginRequest`, `CreatePlaylistRequest`, etc.), with zero
  runtime code. This is the single source of truth both sides compile
  against.
- **`api-client`** — a typed `ApiClient` wrapping `fetch`, grouped into
  `AuthClient` / `CatalogClient` / `LibraryClient`. Two things worth
  noting:
  - `CatalogClient` requests pass `skipAuth: true` — catalog reads never
    attach a token or trigger refresh, matching the backend's unguarded
    controller.
  - `HttpClient` retries a request exactly once after a 401, by calling
    `/auth/refresh` and replaying the original request. Concurrent 401s
    share a single in-flight refresh call (`refreshInFlight`) rather than
    each independently rotating the refresh token — per
    `decisions/0005-auth-token-strategy.md`, each rotation invalidates the
    previous token, so two independent refreshes from concurrent requests
    would make one of them fail replay detection for no reason.
  - The package's own `tsconfig.json` adds `"lib": ["ES2022", "DOM"]`
    locally (not in the shared base config) purely for `fetch`/
    `Response`/`URL` types — React Native provides these as runtime
    globals without the DOM lib, but the shared base tsconfig
    deliberately doesn't assume DOM is available for every package, so
    this stays scoped to the one package that needs it.

## Minimal auth UI as a Phase 4 prerequisite

Phase 4's roadmap line is "mobile screens consuming [catalog/library] via
TanStack Query" — the Library screen specifically needs a signed-in user
to have anything to fetch. Rather than deferring auth UI to a later phase
and stubbing a fake user, minimal login/register screens and secure token
storage were built now, scoped tightly:

- `expo-secure-store` holds the access and refresh tokens as two separate
  keys (not one JSON blob) — this is simply SecureStore's native per-key
  API; there's no serialization advantage to combining them.
- `useAuthStore` (Zustand, **not persisted**) holds only the in-memory
  user profile and a `isBootstrapped` flag. It is deliberately not a
  persistence layer itself — per `state-management.md`, the actual secret
  lives in SecureStore, and the profile is server state re-fetched via
  `bootstrap()` on every cold start, not something Zustand needs to
  remember across restarts on its own.
- Routing between the signed-out and signed-in parts of the app uses Expo
  Router's `Stack.Protected guard={...}` (see "Routing" below), not a
  hand-rolled redirect.
- No password reset, email verification, or account settings screens exist
  — none of those are required to reach the library screens, so none were
  built. They remain out of scope until a later phase calls for them.

## Routing: `Stack.Protected` over a hand-rolled guard

The root layout (`apps/mobile/src/app/_layout.tsx`) gates three route
groups — `splash`, `(auth)`, `(tabs)` — behind boolean guards using Expo
Router's `Stack.Protected` API:

```tsx
<Stack.Protected guard={!isBootstrapped}>
  <Stack.Screen name="splash" />
</Stack.Protected>
<Stack.Protected guard={isBootstrapped && !isAuthenticated}>
  <Stack.Screen name="(auth)" />
</Stack.Protected>
<Stack.Protected guard={isBootstrapped && isAuthenticated}>
  <Stack.Screen name="(tabs)" />
</Stack.Protected>
```

A hand-rolled alternative (`useSegments()` + `<Redirect>`, checked in a
`useEffect`) was built first and then removed in favor of this. The
hand-rolled version needs to separately handle: computing the current
segment, deciding whether a redirect is needed, and clearing/rewriting
navigation history so the back button doesn't return to a now-inaccessible
screen. `Stack.Protected` is Expo Router's current, documented mechanism
for exactly this (confirmed via docs.expo.dev/router/advanced/protected,
not a deprecated pattern) and handles all of that internally — so the
hand-rolled version was strictly more code for the same behavior.

## Mobile data layer: what each screen fetches *(as originally built — see `music-provider-architecture.md` for the current data sources)*

| Screen | Query | Auth required |
|---|---|---|
| Home (`(tabs)/index.tsx`) | `catalog.listTracks()` — full track feed | No |
| Explore (`(tabs)/explore.tsx`) | `catalog.searchTracks(query)` — enabled only once the search box is non-empty | No |
| Library (`(tabs)/library.tsx`) | `library.listPlaylists()` | Yes (screen only renders once `Stack.Protected` admits the `(tabs)` group) |

Under the provider model, Home moves to `GET /recommendations` (it stays
the personalized landing page, not replaced by Search) and Explore/Search
moves to `GET /search`; Library's row is unchanged. `catalog.listTracks()`
in particular never made sense against a provider-backed catalog (you
generally can't cheaply enumerate an entire external catalog), which is
part of why this had to change regardless of the broader product pivot.

Both Home and Explore also fetch the full artist list
(`catalog.listArtists()`, via a shared `useArtistNameMap` hook) to resolve
each track's `artistId` to a display name, since `Track` intentionally
carries only the id (see `packages/shared-types/src/domain/track.ts`) —
denormalizing the artist name onto every track response would duplicate
data that's cheap to join client-side for a catalog this size. This
id-to-name resolution pattern is unchanged by the provider pivot —
`artistId` still points at a local row (now a cache row rather than an
owned one), so `useArtistNameMap` keeps working the same way.

Playlist creation/editing and the `library/saved` (likes/follows) endpoints
are implemented on the backend (`LibraryClient.createPlaylist`, `.save`,
`.listSaved`, etc.) but have no mobile UI yet — there's no meaningful way
to add a track to a playlist before Phase 5 (audio playback engine) gives
the app a "now playing" context to add *from*. Building that UI now would
mean either a dead-end placeholder or inventing a workflow that gets
reworked once playback exists. This is still true post-pivot.

## Known limitations *(as of Phase 4 — see `music-provider-architecture.md` for limitations introduced by the provider pivot)*

- Tab bar iconography reuses the Explore icon as a placeholder for
  Library — no dedicated asset exists yet; deferred to Phase 7 (motion &
  polish).
- No pagination on `catalog.listTracks()`/`listArtists()` — acceptable at
  current seed-data scale, revisited once there's a reason to (a real
  upload pipeline in a later phase, or a noticeably large seed set).
- Live device/simulator verification of the auth+catalog+library screens
  against a real running backend was not performed in this environment
  (no Docker available to run the Postgres/Redis/MinIO Compose stack).
  Correctness was instead verified via: the backend's 38 e2e tests running
  against embedded PGlite Postgres, the mobile app's clean typecheck/lint/
  `expo export` build (all 13 routes present), and the compile-time
  `implements Track/Playlist/...` contracts between backend DTOs and
  `packages/shared-types`. This is a real gap versus an actual live-network
  smoke test and is called out explicitly rather than assumed to be
  equivalent.
