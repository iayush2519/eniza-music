# Music Provider Architecture

This supersedes the upload-platform framing in `content-model.md` and the
catalog-ownership framing in `catalog-and-library.md`. See
`decisions/0007-provider-backed-music-catalog.md` for why this changed.

## Product shape this serves

The primary flow is:

```
Open App → (personalized) Home  ⇄  Search → Results → Tap Track → Immediate Playback
```

Home and Search are both first-class, permanent surfaces — Search is not a
replacement for Home. Home is the personalized landing page (recently
played, recommended for you, your playlists); Search is how a user finds
something specific they have in mind. Both ultimately render the same
underlying `Track`/`Album`/`Artist` shapes and both lead to the same
playback path.

## What the backend owns vs. what it delegates

**Owned outright** (unchanged from the original brief, all backed by
Postgres tables the backend fully controls):

Authentication, Users, Playlists, Library/Favorites, Listening History,
Search History, Recommendations, Settings, Analytics, Provider response
caching.

**Delegated to a provider**: the actual music — audio bytes, canonical
track/album/artist metadata, full-catalog search. The backend never hosts
audio and never lets a client "publish" a track. It calls out to a
`MusicProvider`, caches what comes back, and serves the cache.

## The `MusicProvider` abstraction

```ts
interface MusicProvider {
  readonly providerId: string; // e.g. 'jamendo', 'audius', 'mock'

  search(query: string, options: SearchOptions): Promise<ProviderSearchResult>;
  getTrack(externalId: string): Promise<ProviderTrack | null>;
  getAlbum(externalId: string): Promise<ProviderAlbum | null>;
  getArtist(externalId: string): Promise<ProviderArtist | null>;
  resolveStreamUrl(externalId: string): Promise<ResolvedStream>;
  // Optional capability — not every provider implements this:
  getRelatedTracks?(externalId: string): Promise<ProviderTrack[]>;
}
```

Every adapter (`JamendoProvider`, `AudiusProvider`, `MockProvider`, ...)
maps its own API's response shape into normalized `ProviderTrack` /
`ProviderAlbum` / `ProviderArtist` DTOs. Nothing above this layer — the
Gateway, the cache, other backend modules, or the mobile app — ever sees a
provider's native response format.

**Open decision, not yet made:** which real provider. Candidates that
offer a genuine third-party metadata + direct-stream API (compatible with
keeping our own Media3/ExoPlayer engine per ADR 0002, rather than requiring
an embedded first-party player) include Jamendo and Audius. Platforms like
Spotify/Apple Music/YouTube are not viable here — none of them permit
extracting a raw playable URL for a custom player; they require their own
embedded SDK/UI. A `MockProvider` (a small curated set of freely-licensed
sample tracks, in the same spirit as the Phase 4 seed data) is built first
regardless, so every other module can be built and tested against a
stable, fast, offline-friendly fake before a real external API — with its
auth, rate limits, and network variability — enters the loop.

## `MusicGateway`: the provider manager

A single `MusicGateway` service sits between the rest of the backend and
every `MusicProvider` implementation. **No other module ever calls a
provider directly** — same discipline the codebase already applies to
`storage` (S3/MinIO) and `queue` (BullMQ).

```
search module ─┐
playback module ├──▶ MusicGateway ──▶ MusicProvider (Jamendo | Audius | Mock)
recommendations ┘         │
                           ▼
                  metadata cache (artists/albums/tracks)
                  + Redis response cache
```

The Gateway's responsibilities:

1. **Cache-first reads.** For search and metadata lookups, check the local
   metadata cache (see below) and the Redis response cache before calling
   a provider.
2. **Upsert on cache miss/refresh.** When a provider call is made, the
   normalized result is upserted into the metadata cache tables, not just
   returned — the cache is populated as a side effect of normal traffic,
   not only by a separate sync job.
3. **Provider selection.** Today there's effectively one active provider;
   the interface supports a registry (`Map<providerId, MusicProvider>`)
   from day one so adding a second provider later (e.g. to fill catalog
   gaps) is additive, not a rewrite. If multiple providers are ever active
   simultaneously, merging/ranking their results is the Gateway's job, not
   something callers handle.
4. **Stream URL resolution.** `resolvePlaybackUrl(cacheTrackId)` looks up
   the cache row for `providerId` + `externalId`, delegates to that
   provider's `resolveStreamUrl`, and returns the URL to the `playback`
   module (see below).

## Metadata cache: `artists`, `albums`, `tracks` stay, repurposed

Per your direction, the Phase 4 tables are **not dropped**. Their role
changes:

| | Phase 4 (upload platform) | Now (provider cache) |
|---|---|---|
| Row created by | An artist's own upload/publish flow | `MusicGateway`, upserting a provider response |
| `id` | The row *is* the canonical entity | The row is a **local cache handle** for a provider entity |
| Row meaning | "This track exists because we host it" | "This is what the provider last told us about this track, as of `lastRefreshedAt`" |
| Referenced by | `playlist_tracks`, `library_entries` | Same — **unchanged reference shape** |

Concrete schema changes to the three tables:

- Add `providerId text not null` and `externalId text not null` to each of
  `artists`, `albums`, `tracks`, with a unique index on
  `(providerId, externalId)` per table — this is the cache key. A given
  provider entity is cached at most once.
- Add `lastRefreshedAt timestamp not null default now()` to each — drives
  staleness detection for background refresh.
- `sourceKind`/`licenseType` enums on `tracks` (added in Phase 4 for
  exactly this kind of future-proofing) stay, and gain the values they were
  always reserved for (e.g. `sourceKind` effectively becomes "which
  provider," already tracked more precisely by the new `providerId`
  column — `sourceKind` can be simplified or left as a coarser category;
  not a decision that needs to block this doc).
- Drop the `artistId` **not-null** constraint on `tracks`/the upload-era
  assumption that every track is tied to an account we control — an
  artist row cached from a provider has no `userId` linking it to one of
  our accounts, so `artists.userId` (currently `not null unique`,
  Phase 4) becomes **nullable**: a cached artist is not necessarily (and
  in practice will almost never be) one of our own users anymore.

### Why keep local ids instead of referencing `(providerId, externalId)` directly (your revision #3)

`playlist_tracks.trackId` and `library_entries.entityId` continue to
reference the cache tables' local `uuid` ids, **not** raw provider ids,
wherever practical:

- A playlist/library read becomes a plain local join — no need to touch
  the provider or even know which provider a given track came from just to
  render a playlist.
- If a provider is ever swapped or a second one is added, existing
  playlists don't need a migration — only the cache row's `providerId`/
  `externalId` values are provider-specific; the local id a playlist points
  at is stable.
- A playlist keeps rendering (title, artist, artwork) from the cache row
  even during a provider outage or after upstream deletion/rename, because
  the cache row still exists locally — it just becomes eligible for a
  background refresh (see below) rather than failing to render at all.

"Wherever practical" carve-out: transient, never-saved data (a live search
results list, a "related tracks" panel) does not need to provoke a cache
row write-and-reference round trip merely to be displayed — those render
directly from the Gateway's normalized DTOs. A cache row is guaranteed to
exist for a track by the time anything durable (`playlist_tracks`,
`library_entries`, `listening_history`) needs to reference it, because
adding it to any of those triggers a cache upsert first if one doesn't
already exist.

## Background metadata refresh for stale cache rows

Two complementary mechanisms, both using the `queue` module (BullMQ,
already provisioned via Docker Compose since Phase 3, previously reserved
for transcoding jobs that no longer exist under this model):

1. **Lazy refresh on read.** When the Gateway serves a cache row older
   than a TTL (e.g. 24h for tracks/albums, shorter for anything
   search-result-derived), it still returns the cached row immediately
   (never blocks a user-facing request on a provider round trip) and
   enqueues a background refresh job for that row.
2. **Scheduled sweep.** A recurring job (Nest's `@nestjs/schedule`, or a
   BullMQ repeatable job) periodically scans for rows past their TTL that
   *haven't* been organically hit by (1) — e.g. tracks sitting untouched in
   a playlist — and enqueues refreshes for them too, so a playlist a user
   hasn't opened in weeks doesn't silently go stale indefinitely.

A refresh job calls the Gateway, which re-fetches from the provider and
updates the existing cache row in place (same local id — nothing
referencing it needs to change) and bumps `lastRefreshedAt`. If the
provider reports the entity no longer exists, the row is flagged (e.g.
`unavailable: true`) rather than deleted, so playlists/library entries
still resolve to *something* renderable ("Track unavailable") instead of a
dangling reference.

## Search architecture

- `search` module: `GET /search?q=&type=track|album|artist` → `MusicGateway`
  → provider (cache-first, as above).
- Every search request also writes a `search_history` row
  (`userId`, `query`, `resultCount`, `createdAt`) — read by both a
  "recent searches" mobile affordance and the recommendations module.
- Redis holds the short-TTL response cache for raw search result pages
  (keyed on normalized query text); the Postgres metadata cache is
  reserved for entity-level records (a specific track/album/artist), which
  is a different cache granularity than "this exact search string returned
  these results."

## Playback architecture

- `playback` module: `resolvePlaybackUrl(trackId)` where `trackId` is the
  **local cache id** (matching how mobile already references tracks
  everywhere else — playlists, library, search results all use the same
  `Track.id` shape).
- Looks up the cache row, delegates to `MusicGateway.resolveStreamUrl`,
  returns a (possibly short-TTL, provider-issued) stream URL.
- Fire-and-forget write to `listening_history` on resolution (doesn't block
  the URL response) — captures `userId`, `trackId`, `playedAt`, and is
  later updated with `durationListenedSeconds`/`completed`/`skipped` as
  playback progresses (see mobile responsibilities).
- `packages/audio-engine`'s `PlaybackEngine` interface (Phase 5, unbuilt)
  is unaffected — it still just receives a URL and plays it; where that
  URL came from is invisible to it, exactly like the original
  `resolvePlaybackUrl` port in the old `content-model.md` was designed to
  make possible.

## Recommendation architecture (revised: our data first, provider data second)

Primary signal is **our own user-behavior data**, not the provider:

- `listening_history` — plays, `durationListenedSeconds`, `completed`,
  `skipped` (a track skipped in the first few seconds is a strong negative
  signal; a repeated full listen is a strong positive one).
- `search_history` — what users look for, even when they don't play the
  top result.
- `library_entries` — explicit likes/follows.
- `playlists`/`playlist_tracks` — implicit curation signal (tracks a user
  put deliberate effort into grouping together).

A `RecommendationsService` computes heuristic scores from these (e.g.
most-played artists/genres recently, tracks frequently co-occurring in the
same playlists as ones a user already likes, "finish rate" as a quality
signal) — no ML infrastructure, consistent with the project's existing
portfolio-scope calls (ADR 0002/0003's reasoning about not over-building
infra with no current payoff applies equally here.

**Provider enrichment is optional and secondary**: once a candidate set
exists from our own data, the Gateway's `getRelatedTracks` (where the
active provider supports it) can expand that set — e.g. "users who like
[artist you play a lot] on the provider's own related-artist graph." This
is explicitly an enrichment step behind a capability check, never a
required dependency — if the active provider doesn't implement
`getRelatedTracks`, recommendations still work from behavioral data alone.

`GET /recommendations` (or a set of typed sections: `for-you`,
`recently-played`, `because-you-liked-x`) backs the Home screen.

## Database changes, summarized

**Kept, altered:**
- `artists`, `albums`, `tracks` — add `providerId`, `externalId` (unique
  together), `lastRefreshedAt`, optional `unavailable` flag;
  `artists.userId` becomes nullable.

**Unchanged:**
- `users`, `sessions`, `playlists`, `playlist_tracks`, `library_entries` —
  no shape change. They already referenced local ids; those ids now point
  at cache rows instead of owned rows.

**New:**
- `search_history` (`userId`, `query`, `resultCount`, `createdAt`)
- `listening_history` (`userId`, `trackId` → cache table, `playedAt`,
  `durationListenedSeconds`, `completed`, `skipped`)
- `settings` (small table or JSON column on `users` — preferences were
  explicitly deferred in `backend-architecture.md` "until a feature
  actually needs them"; recommendations and playback now do)

**Removed:** nothing. This is the key difference from the original
proposal — no destructive migration, no data loss risk, Phase 4's schema
investment is preserved.

## Backend module map (post-change)

- `auth`, `users` — unchanged.
- `catalog` → renamed/reduced to own **only** the metadata cache tables and
  the upsert/refresh logic the Gateway uses; loses its public
  "browse everything" controller surface (there's no owned catalog to
  browse — search replaces browse as the discovery entry point).
- `discovery` (new) — houses `MusicGateway`, provider adapters, `search`
  module.
- `playback` (new) — stream URL resolution + `listening_history` writes.
- `library` — unchanged pattern; references cache-table ids as before.
- `history` (new) — `search_history` + `listening_history` read/write
  surface, feeds `recommendations`.
- `recommendations` (new) — heuristic scorer over behavioral data +
  optional Gateway enrichment.
- `settings` (new) — small.
- `queue` — same BullMQ port, now used for metadata refresh jobs instead of
  (never-built) transcode jobs.

## Mobile responsibilities (post-change)

- **Home** stays the personalized landing page — recommendations,
  recently played, "your playlists" — not replaced by Search. It calls
  `GET /recommendations` instead of the old "list every track"
  `catalog.listTracks()`, which never made sense against a provider-backed
  catalog anyway (you generally cannot cheaply enumerate an entire
  external catalog).
- **Search/Explore** is a first-class permanent tab (not a takeover of
  Home) — the primary way a user finds something specific: query → results
  → tap → playback, matching the stated product flow exactly.
- **Library** is structurally unaffected — same screen, same
  `LibraryClient` shape; only the `Track`/`Album`/`Artist` types flowing
  through it gain `providerId`/`externalId` (which the UI never needs to
  render directly).
- `useArtistNameMap`'s *purpose* (resolve an id to a display name) still
  applies, since tracks still reference an `artistId` pointing at a cache
  row — no mobile-side conceptual change there, just a different backing
  table semantics.
- `api-client`: `CatalogClient`'s "browse" methods (`listTracks`,
  `listAlbums`, `listArtists`) are replaced by a `SearchClient` +
  `RecommendationsClient`; single-entity lookups (`getTrack`, `getAlbum`,
  `getArtist`) stay, since "fetch one cached entity by id" remains a valid
  operation.

## Migration strategy

1. This document + ADR 0007 — current step, awaiting approval.
2. Migration: add `providerId`/`externalId`/`lastRefreshedAt` columns (+
   unique index) to `artists`/`albums`/`tracks`; make `artists.userId`
   nullable; add `search_history`, `listening_history`, `settings`.
   Additive to existing tables — no data-destructive step.
3. Backend: build `MusicProvider` interface, `MockProvider`, `MusicGateway`
   with cache-first read + upsert-on-miss, behind a new `discovery` module.
4. Backend: `search` and `playback` modules built on the Gateway; remove
   the old `catalog` "browse everything" controller routes (`listTracks`,
   `listAlbums`, `listArtists` with no query) since there's no owned
   catalog to enumerate — single-entity lookups by id stay.
5. Backend: `history` module (search + listening history writes);
   `recommendations` module (heuristic scorer over that data, optional
   Gateway enrichment); `settings` module.
6. Backend: background refresh — lazy-on-read enqueue + scheduled sweep,
   via the existing `queue` port.
7. Update the Phase 4 seed script: replace "seed artists who upload
   tracks" with seeding the metadata cache directly via `MockProvider`
   responses (through the Gateway's own upsert path, so the seed script
   exercises the real cache-write code instead of duplicating it) plus a
   couple of demo playlists/library entries referencing the resulting
   cache rows.
8. `shared-types` + `api-client` updated together — `Track`/`Album`/
   `Artist` gain `providerId`/`externalId`; new `RecommendationsClient`;
   `CatalogClient` reduced/renamed.
9. Mobile: Home switches to `GET /recommendations`; Search/Explore
   switches to `GET /search`; Library unaffected structurally.
10. Wire a real provider adapter (Jamendo/Audius — pending a decision,
    tracked above) once the `MockProvider`-backed path is verified
    end-to-end.
11. Full validation (typecheck/lint/build/e2e) before considering this
    complete.
12. Docs: this file + ADR 0007 are the new source of truth;
    `content-model.md` and `catalog-and-library.md` are updated to point
    here rather than describing the retired upload model (see the note at
    the top of each).
