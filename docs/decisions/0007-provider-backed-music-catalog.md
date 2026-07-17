# ADR 0007: Provider-backed music catalog with local metadata caching

**Status:** Accepted
**Date:** 2026-07-19

## Context

ADR 0003 chose an independent-artist upload platform as the content model:
artists upload tracks, we store and serve them. That decision was made to
avoid needing a real licensing relationship for a portfolio project.

The product direction has changed. The app is now defined as a premium
Android music streaming client in the spirit of Apple Music/Spotify (own
original identity, not a clone), with a primary flow of
**search → results → tap → immediate playback**. The backend is no longer
meant to own or host audio, or model artists as uploading users. It should
own everything genuinely user-specific — auth, users, playlists, library,
favorites, listening history, search history, recommendations, settings,
analytics — and reach music discovery/playback through a **provider
abstraction**, so a real external music source can be swapped or added to
later without changing the mobile app.

## Decision

- Introduce a `MusicProvider` interface and a `MusicGateway` (the single
  provider manager/registry) that is the only thing in the backend allowed
  to call an external music API. See
  [`music-provider-architecture.md`](../architecture/music-provider-architecture.md)
  for the concrete design.
- **Keep** the `artists`, `albums`, and `tracks` tables built in Phase 4.
  They are not dropped. They are repurposed from an *owned catalog* into a
  **local metadata cache** of provider responses, upserted exclusively by
  the `MusicGateway`. This preserves the working, tested Phase 4 schema and
  — more importantly — gives playlists and library entries a stable local
  id to reference that survives provider-side changes or outages.
- Remove the `catalog` module's "browse the whole catalog" surface (there
  is no owned catalog to browse anymore) and replace it with `search`
  (discovery) and `playback` modules that read/write the cache through the
  Gateway.
- Add background metadata refresh for stale cache rows, reusing the
  `queue` port already provisioned for this purpose since Phase 3
  (previously reserved for upload transcoding, which no longer exists).
- Recommendations are generated primarily from our own user-behavior data
  (listening history, likes, playlists, searches, skips, repeats), with
  provider-side "related tracks" as an optional, secondary enrichment
  signal — never a hard dependency.
- `users.isArtist` is left exactly as-is. It has no attached behavior under
  this model, but removing or repurposing it is explicitly out of scope for
  this change.

## Alternatives considered

- **Drop `artists`/`albums`/`tracks` entirely; have playlists/library
  reference raw `(providerId, externalId)` pairs directly.** This was the
  initial proposal. Rejected: it throws away a working Phase 4 schema
  investment for no real benefit, and it means a playlist's rendering
  becomes directly dependent on the provider being reachable and that exact
  record still existing every time it's viewed — a local cache with stable
  ids avoids both problems while still fully decoupling the mobile app from
  any specific provider.
- **No caching, always call the provider live.** Rejected: provider
  response caching is an explicitly named backend responsibility, and a
  live-only design would make every screen latency- and rate-limit-bound on
  a third party.
- **Recommendations driven primarily by provider "related content" APIs.**
  Rejected as the primary signal: it would make the recommendation quality
  entirely dependent on a specific provider's related-content feature
  (which may not exist or may be low quality), and wouldn't reflect what
  our own users actually do in our app. Our own behavioral data is treated
  as the primary signal; provider enrichment is additive only.

## Consequences

- `MusicGateway` becomes the sole writer of `artists`/`albums`/`tracks` —
  no client-facing "create/upload a track" endpoint exists anymore.
- Cache rows need a staleness concept (`lastRefreshedAt`) and a refresh
  mechanism (lazy-on-read plus a scheduled sweep), which is real added
  complexity a live-only design wouldn't have — accepted in exchange for
  latency, resilience, and rate-limit benefits.
- `playlist_tracks` and `library_entries` require no shape change: they
  already reference local ids (Phase 4 design), which now happen to point
  at cache rows instead of owned rows.
- `users.isArtist` and any remaining upload-era comments in the codebase
  become vestigial. Left in place rather than cleaned up now, per explicit
  direction.
- The provider actually chosen must offer a genuine third-party metadata +
  streaming API (not just a web player embed) to remain compatible with
  the existing custom Media3/ExoPlayer engine (ADR 0002) — this is an open
  decision, not yet made, tracked in
  `music-provider-architecture.md`.
