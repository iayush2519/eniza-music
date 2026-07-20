# Backend Architecture

**Status: current as of Phase 6.1 (2026-07-20).** This document describes
the actual, current shape of `apps/api` — every module listed below exists
in the codebase today, at the path given. It supersedes the "planned"
framing this document previously carried (written during the Phase 4.5
design step, before the modules it described were actually built).

## Style: modular monolith

A single NestJS application, internally divided into modules with clear
boundaries, rather than microservices. Microservices would add real
operational overhead (service discovery, distributed tracing, network
failure handling) with no current payoff — there's one team, one deploy
target, and no module has a scaling profile different enough from the
others to justify splitting yet. Module boundaries are drawn so that a
future split (if ever needed) is a matter of moving a module to its own
process, not a rewrite. This has not changed since Phase 3 and is not
under review.

## Modules (as built)

| Module | Path | Responsibility |
|---|---|---|
| `auth` | `src/auth/` | Registration, login, JWT access + rotating refresh tokens, session/device tracking, email OTP verification, forgot/reset password |
| `users` | `src/users/` | Minimal profile data (`GET /users/me`) |
| `catalog` | `src/catalog/` | Owns the metadata **cache** tables (`artists`/`albums`/`tracks`) and the upsert/refresh logic `MusicGateway` uses; single-entity lookups by id |
| `discovery` | `src/discovery/` | `MusicGateway`, `MusicProvider` adapters, `GET /search` |
| `library` | `src/library/` | A user's playlists, likes, and follows — ownership-scoped |
| `playback` | `src/playback/` | Stream URL resolution + `listening_history` writes |
| `recommendations` | `src/recommendations/` | Behavioral-first recommendation sections backing Home |
| `queue` | `src/queue/` | BullMQ (or an inline fallback) for background metadata refresh jobs |
| `database` | `src/database/` | Drizzle schema, migrations, seed script, the `DATABASE_CONNECTION` DI token |
| `config` | `src/config/` | Environment variable validation (`env.validation.ts`) |

**Not yet built as separate modules** (tracked in the roadmap, not
oversights):

- **`settings`** — the `settings` table (`src/database/schema/settings.schema.ts`)
  exists, but no `SettingsModule`/controller/service consumes it yet.
  Tracked as Phase 6.3.
- **`history`** — `search_history` and `listening_history` are currently
  written directly by `discovery`'s `SearchService` and `playback`'s
  `PlaybackService` respectively, not by a dedicated `history` module.
  This was sketched as a future module in earlier design docs but has not
  been extracted, and there is no current need to — both write sites are
  simple, single-table inserts colocated with the request that produces
  them. Revisit only if read-side logic (e.g. a "recent searches"
  endpoint) grows complex enough to warrant its own module.
- **`storage`** — an object-storage port (S3/MinIO) was provisioned via
  Docker Compose from Phase 3 for a hypothetical future need (e.g. cached
  artwork), but no module or code path uses it. Not built because nothing
  currently needs it — this is intentionally unbuilt, not missing.
- **Notifications, monetization, admin/CMS** — see
  [`system-overview.md`](./system-overview.md)'s Technical Debt section;
  none of these have committed scope.

## Ports and adapters at the infrastructure edges

Two boundaries are deliberately abstracted behind interfaces, because their
concrete implementation differs between local dev and any future
deployment:

- **`MusicGateway`** (`discovery` module) — the single point of contact
  with `MusicProvider` adapters (Jamendo, `MockProvider`). No other module
  calls a provider directly.
- **Metadata refresh queue** (`queue` module,
  `METADATA_REFRESH_QUEUE` DI token) — `BullMqMetadataRefreshQueue` when
  `REDIS_URL` is configured, `InlineMetadataRefreshQueue` (in-process, no
  Redis) otherwise. Selected by a factory in `queue.module.ts`; consumers
  never see the concrete class, only the token. This is also why local
  dev and the e2e test suite work without Redis running.

This is intentionally *not* over-abstracted further — e.g. database access
itself is not behind a repository-per-module layer; Drizzle's typed query
builder is used directly in each module's service. Adding a repository
layer with no second implementation planned would be speculative
complexity.

## API surface (current endpoints, by module)

| Module | Endpoints |
|---|---|
| `auth` | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/verify-otp`, `/resend-otp`, `/forgot-password`, `/forgot-password/verify`, `/reset-password` |
| `users` | `GET /users/me` |
| `catalog` | Single-entity lookups by id (tracks/albums/artists), new-releases listing (paginated) |
| `discovery` | `GET /search?q=&type=` |
| `library` | Playlist CRUD, playlist-track management, `POST /library/saved`, `GET /library/saved` |
| `playback` | Stream URL resolution, `POST /playback/progress` |
| `recommendations` | `GET /recommendations` |

## Data flow: search

1. Mobile calls `GET /search?q=...`.
2. `discovery`'s `SearchService` checks the Redis response cache, then
   `MusicGateway` checks the Postgres metadata cache, before calling the
   active `MusicProvider`.
3. Any provider result is normalized and upserted into the metadata cache
   (`artists`/`albums`/`tracks`, tagged with `providerId`/`externalId`) as
   a side effect of serving the request.
4. Stale cache rows (past their TTL) are still served immediately; a
   background refresh is enqueued via `queue` rather than blocking the
   response.
5. A `search_history` row is written (fire-and-forget), feeding
   `recommendations`.

## Data flow: playback

1. Mobile requests a stream URL for a **local metadata cache id** (the
   same id playlists and library entries already reference).
2. `playback`'s `PlaybackService` looks up the cache row, and asks
   `MusicGateway` to resolve a stream URL from the row's
   `providerId`/`externalId` via that provider's adapter.
3. A `listening_history` row is written (fire-and-forget), later updated
   with `durationListenedSeconds`/`completed`/`skipped` as the mobile app
   reports playback progress (`POST /playback/progress`).
4. Mobile hands the URL to `packages/audio-engine` — see
   [`playback-engine.md`](./playback-engine.md).

## AWS-readiness without AWS lock-in for local dev

- Local development runs Postgres, Redis, and MinIO via Docker Compose
  (`docker-compose.yml` at the repo root) — no AWS account required to
  develop. Redis is consumed by `discovery`'s provider response cache and
  by `queue`'s metadata-refresh jobs; MinIO/the storage port remains
  provisioned but unused (see above).
- Infra-as-code (Terraform) is written when the deployment phase starts,
  targeting RDS (Postgres), ElastiCache (Redis), S3, CloudFront, and a
  container runtime — reassessed once Phase 6.4–6.6 land. None of this is
  provisioned yet. See [`../deployment/ci-cd.md`](../deployment/ci-cd.md)
  for the current, more limited near-term CI plan.

## Configuration and startup validation

`ConfigModule` is configured with a `validate` function
(`src/config/env.validation.ts`) that fails application startup
immediately, with a clear error message, if required environment
variables are missing or malformed (e.g. a JWT secret shorter than 32
characters). This is deliberate: a misconfigured secret that's merely
`undefined` should never silently sign tokens with the literal string
`"undefined"` — the failure needs to happen at boot, not the first time a
real request hits the affected code path.

## Database layer

Drizzle ORM connects to Postgres via the `postgres` (postgres-js) driver,
provided through a single `@Global()` `DatabaseModule` behind an explicit
DI token (`DATABASE_CONNECTION`) rather than a concrete class — this keeps
every consuming service decoupled from the specific driver, and is also
what makes the database swappable in tests without touching application
code.

Schema is defined in `src/database/schema/*.schema.ts` — currently 12
tables: `users`, `sessions`, `email_otps`, `artists`, `albums`, `tracks`,
`playlists`, `playlist_tracks`, `library_entries`, `search_history`,
`listening_history`, `settings` (see `src/database/schema/index.ts` for
the authoritative list). Migrations are generated via `drizzle-kit
generate` and committed to `src/database/migrations/`, then applied via
`drizzle-kit migrate` against a real Postgres instance (Docker Compose
locally).

### Testing without Docker

The e2e test suite (`apps/api/test/*.e2e-spec.ts`) does not require Docker
or a running Postgres instance. It connects Drizzle directly to
`@electric-sql/pglite` (an embedded, WASM-compiled Postgres) via
`drizzle-orm/pglite`, applies the same committed SQL migration files used
against real Postgres, and overrides the `DATABASE_CONNECTION` provider in
a Nest `TestingModule`. This is a real Postgres-compatible database for
test purposes — not a mock — so tests exercise actual SQL, constraints,
and Drizzle query behavior. Current e2e suites: `app`, `auth`, `catalog`,
`library`, `metadata-refresh`, `music-gateway`, `playback`,
`recommendations` (`apps/api/test/*.e2e-spec.ts`).

## Security posture (summary — full detail in `security.md`)

- All mutating endpoints require auth; ownership checks are explicit in
  service methods (e.g. a user can only edit their own playlists).
- Input validation via DTOs (`class-validator`) on every endpoint
  boundary.
- Secrets (DB credentials, JWT signing keys) come from environment
  variables locally, never committed (`apps/api/.env.example` documents
  required variables with no real values).
- **Known gap, tracked as Phase 6.5:** no rate limiting exists yet on
  public endpoints, `GET /search` in particular, which proxies to a
  rate-limited external provider.

## Technical debt specific to the backend

See [`system-overview.md`](./system-overview.md)'s Technical Debt section
for the full, canonical register. Backend-specific highlights:

- `ConsoleOtpProvider` is a dev-only stub — **Critical**, tracked as Phase
  6.2.
- No `settings` module — **High**, tracked as Phase 6.3.
- No rate limiting, no dependency vulnerability scanning in CI (there is
  no CI at all yet) — **High**, tracked as Phase 6.4/6.5.
- `storage` port provisioned but entirely unused — not a problem to fix,
  just worth knowing it's there and inert.
