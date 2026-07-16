# Content Model

## Model: independent-artist upload platform

Artists create accounts, upload tracks (with metadata and artwork), and the
platform transcodes and serves them to listeners. This is the sole content
source for the initial release. See ADR 0003 for why this was chosen over a
licensed commercial catalog.

## Designing for a future licensed provider

The initial release only implements the upload-platform source, but the
domain model and backend module boundaries are shaped so a **second content
source** (a licensed catalog provider, reached via an external API) could be
added later without reworking existing code. Concretely:

### 1. `catalog` module owns a `source` concept, not just "tracks"

Every track record carries a `source` discriminator:

```ts
type TrackSource =
  | { kind: 'upload'; uploaderId: string }
  | { kind: 'licensed_provider'; providerId: string; externalTrackId: string };
```

The catalog module's read APIs (search, get-track, get-album) are
source-agnostic from the client's perspective — a listener-facing query
returns the same `Track` shape regardless of where the audio actually lives.

### 2. Playback URL resolution is behind a port, not inlined

The `streaming` module exposes a single `resolvePlaybackUrl(trackId)`
capability. Internally it dispatches based on `source.kind`:

- `upload` → issue a signed CloudFront URL against our own S3 object.
- `licensed_provider` → (future) call the provider's own signed-URL or
  streaming-token API and return that.

Nothing in the mobile app or in other backend modules needs to know which
branch executed. This is the seam where a provider integration plugs in.

### 3. Ingestion is a pluggable pipeline, not a single upload form

The `upload` module's job (validate → store original → enqueue transcode →
publish) is one implementation of a general "ingestion" concept. A future
provider integration would implement a different ingestion job (e.g. a
scheduled sync that pulls a provider's catalog and writes `licensed_provider`
track rows) without touching the upload flow at all.

### 4. Rights/licensing metadata is modeled from day one, even though only
one value is used today

Tracks carry a `licenseType` field (`'artist_direct'` for now). This exists
so that when a licensed source is added, downstream features (analytics,
payout/royalty logic, takedown handling) don't need a schema migration to
become aware of licensing at all — only a new enum value and the provider
integration itself.

## What we are explicitly NOT building yet

- Payout/royalty calculation for artists.
- A licensed-provider integration (no such provider is integrated; the seam
  above is prepared but unused).
- DRM. Uploaded files are the artist's own content; protection is limited to
  signed, expiring URLs (see `security.md`).

## Core entities (initial release)

- `User` — can be a listener, an artist, or both (role flags, not separate
  tables, since one account can do both).
- `Artist` — public-facing profile linked to a `User`.
- `Track` — belongs to one `Artist`, optionally part one `Album`.
- `Album` — belongs to one `Artist`, ordered collection of `Track`s.
- `Playlist` — belongs to one `User`, ordered collection of `Track`s from any
  artist.
- `LibraryEntry` — a user's saved/liked tracks, albums, artists (follow/like
  relationships).
- `PlayEvent` — analytics record (track, user, timestamp, duration listened)
  for future recommendation/royalty use.

Full schema (columns, indexes, migrations) is defined in
`apps/api` once Phase 3 (backend core) starts, not duplicated here — this
document describes the *shape*, not the DDL.
