# Content Model

> **Superseded.** This document originally described an independent-artist
> upload platform (ADR 0003). That model has been replaced by a
> provider-backed catalog with local metadata caching — see
> [`decisions/0007-provider-backed-music-catalog.md`](../decisions/0007-provider-backed-music-catalog.md)
> and [`music-provider-architecture.md`](./music-provider-architecture.md)
> for the current design. This document is kept for historical context
> (why the original model was chosen, and which of its seams carried
> forward) rather than deleted outright.

## Original model: independent-artist upload platform

Artists created accounts, uploaded tracks (with metadata and artwork), and
the platform transcoded and served them to listeners. See ADR 0003 for why
this was chosen initially (no real licensing deal available for a
portfolio project) and ADR 0007 for why it was replaced (product direction
changed to a search-first streaming client in the spirit of Apple
Music/Spotify, which requires real third-party catalog breadth no
self-upload model can provide).

## What carried forward into the provider model

The original design already anticipated *adding* a licensed provider
alongside uploads (a `source` discriminator on tracks, a
`resolvePlaybackUrl` port, pluggable ingestion). ADR 0007 goes further —
removing uploads entirely rather than keeping them alongside a provider —
but several seams from this document proved directly reusable:

- **Source-agnostic read APIs.** The original catalog module's read APIs
  (search, get-track, get-album) returned the same `Track` shape
  regardless of where the audio lived. This exact principle is now applied
  more broadly: every `Track`/`Album`/`Artist` the mobile app sees is a
  normalized shape, whether it originated from a provider search or a
  cache read.
- **Playback URL resolution behind a port, not inlined.** The original
  `resolvePlaybackUrl(trackId)` capability is preserved almost exactly —
  see `music-provider-architecture.md`'s "Playback architecture" section —
  just with every branch now calling a `MusicProvider` adapter instead of
  one branch calling S3 and another (hypothetically) calling a licensed
  API.
- **Rights/licensing metadata modeled from day one.** The `tracks` table's
  `licenseType` enum (added in Phase 4, only ever holding `'artist_direct'`)
  is now genuinely exercised, since every cached track comes from an
  external provider with its own licensing terms.

## What did not carry forward

- **Ingestion as a pluggable ordinary-user-facing pipeline.** There is no
  upload flow anymore, presigned or otherwise — nothing in this system
  lets a client publish a track. The `artists`/`albums`/`tracks` tables are
  now written exclusively by the `MusicGateway` (see
  `music-provider-architecture.md`), never by a user-facing "create track"
  endpoint.
- **Artists as a class of our own users.** `Artist` used to be a
  public-facing profile linked 1:1 to one of our `User` rows
  (`artists.userId not null unique`). Under the provider model, a cached
  `Artist` row almost always represents a real-world artist who has no
  account in our system at all — `artists.userId` is now nullable, and in
  practice nearly always null.
- **`PlayEvent` as originally sketched.** Superseded by `listening_history`
  (see `music-provider-architecture.md`), which additionally tracks
  `completed`/`skipped` for recommendation purposes, not just analytics.

## Current core entities

See `music-provider-architecture.md` for the authoritative, current
description. In brief: `User`, `Artist`/`Album`/`Track` (now metadata
*cache* rows tagged with `providerId`/`externalId`, not owned content),
`Playlist`, `LibraryEntry`, `SearchHistory`, `ListeningHistory`.
