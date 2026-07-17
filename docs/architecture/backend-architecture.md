# Backend Architecture

## Style: modular monolith

A single NestJS application, internally divided into modules with clear
boundaries, rather than microservices. Microservices would add real
operational overhead (service discovery, distributed tracing, network
failure handling) with no current payoff — there's one team, one deploy
target, and no module has a scaling profile different enough from the
others to justify splitting yet. Module boundaries are drawn so that a
future split (if ever needed) is a matter of moving a module to its own
process, not a rewrite.

## Modules

> **Updated 2026-07-19** — see
> `decisions/0007-provider-backed-music-catalog.md` and
> `music-provider-architecture.md`. The backend no longer hosts audio or
> runs an upload/transcode pipeline; `upload` and `streaming` (as
> originally sketched below) are replaced by `discovery`/`search` and
> `playback`, both built on a `MusicGateway` that wraps external
> `MusicProvider` adapters. `storage` and `queue` survive as
> infrastructure ports, just serving a different purpose (provider
> response caching and metadata refresh jobs, instead of file storage and
> transcode jobs).

- **`auth`** — registration, login, JWT access + rotating refresh tokens,
  session/device tracking for revocation. *(Implemented Phase 3.)*
- **`users`** — profile data, role flags (listener/artist — `isArtist` is
  currently vestigial under the provider model but is left unchanged).
  Preferences are now modeled via the `settings` module below.
  *(Implemented Phase 3, minimal.)*
- **`catalog`** — *(Implemented Phase 4, being reduced.)* Originally
  tracks/albums/artists as owned content with a public browse surface.
  Now owns only the **metadata cache** tables (same tables, repurposed —
  see `music-provider-architecture.md`) and the upsert/refresh logic the
  Gateway uses; the "browse everything" controller routes are retired
  (there's no owned catalog to enumerate) in favor of `search`.
- **`library`** — a user's playlists, likes, follows. Owns the
  many-to-many relationships between users and catalog entities.
  **Unchanged by the provider pivot** — it still references local ids;
  those ids now point at cache rows instead of owned rows.
  *(Implemented Phase 4.)*
- **`discovery`** *(new, replaces `upload`)* — houses `MusicGateway`, the
  `MusicProvider` adapters (a `MockProvider` first, a real provider such
  as Jamendo or Audius once selected), and the `search` module
  (`GET /search`). This is the only part of the backend allowed to call an
  external music API.
- **`playback`** *(new, replaces `streaming`)* — resolves playback URLs by
  delegating to `MusicGateway.resolveStreamUrl`; records
  `listening_history` for analytics and recommendations.
- **`history`** *(new)* — owns `search_history` and `listening_history`
  read/write; feeds `recommendations`.
- **`recommendations`** *(new)* — heuristic scoring over our own
  behavioral data (listening/search history, likes, playlists), with
  optional provider-side enrichment as a secondary signal. Backs the Home
  screen.
- **`settings`** *(new)* — user preferences; small.
- **`storage`** — internal module wrapping the object-storage port (S3 in
  cloud, MinIO locally). No longer used for hosting audio (there's no
  audio to host); retained for anything else that needs object storage
  (e.g. cached artwork, if that's ever needed) — currently unused, not
  removed.
- **`queue`** — wraps BullMQ setup/config. Originally reserved for
  transcode jobs; now used for background metadata cache refresh jobs
  (see `music-provider-architecture.md`).

## Ports and adapters at the infrastructure edges

Two boundaries are deliberately abstracted behind interfaces, because their
concrete implementation is expected to differ between local dev and cloud:

- **Object storage port** (`storage` module) — `putObject`, `getSignedUrl`,
  `deleteObject`. Adapter: S3 in AWS, MinIO locally via the same S3-compatible
  API (so the adapter code is identical; only endpoint/credentials differ).
- **Job queue port** (`queue` module) — thin wrapper over BullMQ so job
  producers/consumers don't reach into Redis connection details directly.

This is intentionally *not* over-abstracted further — e.g. the database
access itself is not behind a repository-per-module abstraction layer;
Drizzle's typed query builder is used directly in each module's service.
Adding a repository layer with no second implementation planned would be
speculative complexity.

## Data flow: search → cache (replaces the old upload → publish flow)

> The original upload → transcode → publish flow described here is
> retired — there is no upload pipeline anymore. See
> `music-provider-architecture.md` for the authoritative current flows;
> summarized below.

1. Mobile app calls `GET /search?q=...`.
2. `discovery`'s `search` module asks `MusicGateway`, which checks the
   Redis response cache, then the Postgres metadata cache, before calling
   the active `MusicProvider`.
3. Any provider result is normalized and upserted into the metadata cache
   (`artists`/`albums`/`tracks`, tagged with `providerId`/`externalId`)
   as a side effect of serving the request — the cache fills itself from
   real traffic, not only a separate sync job.
4. Stale cache rows (past their TTL) are still served immediately, with a
   background refresh enqueued via `queue` rather than blocking the
   response.

## Data flow: playback

1. Mobile app requests `resolvePlaybackUrl(trackId)` from `playback`,
   where `trackId` is a **local metadata cache id** (the same id playlists
   and library entries already reference).
2. `playback` looks up the cache row for that id, and asks `MusicGateway`
   to resolve a stream URL from the row's `providerId`/`externalId` via
   that provider's adapter.
3. `playback` records a `listening_history` row (fire-and-forget, does not
   block the URL response), later updated with
   `durationListenedSeconds`/`completed`/`skipped` as playback progresses.
4. Mobile app hands the URL to the native audio engine — unaffected by any
   of this; it just receives a URL, exactly as originally designed.

## AWS-readiness without AWS lock-in for local dev

- Local development runs Postgres, Redis, and MinIO via Docker Compose
  (`docker-compose.yml` at the repo root, added Phase 3) — no AWS account
  required to develop. Redis is consumed by `discovery`'s provider
  response cache and by `queue`'s metadata-refresh jobs (see
  `music-provider-architecture.md`); MinIO/`storage` remains provisioned
  but unused now that there's no audio to host.
- The `storage` module's adapter is selected by environment variable, not
  by code branching scattered through the codebase.
- Infra-as-code (Terraform) is written when the deployment phase starts,
  targeting: RDS (Postgres), ElastiCache (Redis), S3, CloudFront, and a
  container runtime (ECS Fargate is the default assumption — reassessed at
  that phase). None of this is provisioned yet.

## Configuration and startup validation

`ConfigModule` is configured with a `validate` function
(`src/config/env.validation.ts`) that fails application startup
immediately, with a clear error message, if required environment variables
are missing or malformed (e.g. a JWT secret shorter than 32 characters).
This is deliberate: a misconfigured secret that's merely `undefined` should
never silently sign tokens with the literal string `"undefined"` — the
failure needs to happen at boot, not the first time a real request hits
the affected code path.

## Database layer

Drizzle ORM connects to Postgres via the `postgres` (postgres-js) driver,
provided through a single `@Global()` `DatabaseModule` behind an explicit
DI token (`DATABASE_CONNECTION`) rather than a concrete class — this keeps
every consuming service decoupled from the specific driver, and is also
what makes the database swappable in tests (see below) without touching
application code.

Schema is defined in `src/database/schema/*.schema.ts` (currently `users`
and `sessions`); migrations are generated via `drizzle-kit generate` and
committed to `src/database/migrations/`, then applied via
`drizzle-kit migrate` against a real Postgres instance (Docker Compose
locally, RDS in a real deployment).

### Testing without Docker

The e2e test suite (`apps/api/test/*.e2e-spec.ts`) does not require Docker
or a running Postgres instance. It connects Drizzle directly to
`@electric-sql/pglite` (an embedded, WASM-compiled Postgres) via
`drizzle-orm/pglite`, applies the same committed SQL migration files used
against real Postgres, and overrides the `DATABASE_CONNECTION` provider in
a Nest `TestingModule`. This is a real Postgres-compatible database for
test purposes — not a mock — so tests exercise actual SQL, constraints,
and Drizzle query behavior. See `apps/api/test/test-db.ts`.

## Security posture (summary — full detail in `security.md`)

- All mutating endpoints require auth; ownership checks are explicit in
  service methods (e.g. a user can only edit their own playlists —
  `library.controller.ts`'s `requireOwnedPlaylist`).
- Presigned URLs are short-TTL and scoped to a single object (applies to
  any future `storage` usage; not currently exercised since no audio is
  hosted).
- Input validation via DTOs (`class-validator`) on every endpoint boundary.
- Secrets (DB credentials, JWT signing keys, AWS keys) come from environment
  variables / a secrets manager in production, never committed.
