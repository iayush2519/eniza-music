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

## Modules (initial release)

- **`auth`** — registration, login, JWT access + rotating refresh tokens,
  session/device tracking for revocation. *(Implemented Phase 3.)*
- **`users`** — profile data, role flags (listener/artist). Preferences
  are not yet modeled — deferred until a feature actually needs them.
  *(Implemented Phase 3, minimal.)*
- **`auth`** and **`users`** are implemented as of Phase 3 — see
  `decisions/0005-auth-token-strategy.md` for the concrete token
  design. `catalog`, `library`, `upload`, `streaming`, `storage`, and
  `queue` below describe the intended shape for later phases and are not
  yet built.
- **`catalog`** — tracks, albums, artists, search/browse. Read-heavy,
  source-agnostic (see `content-model.md`).
- **`library`** — a user's playlists, likes, follows. Owns the
  many-to-many relationships between users and catalog entities.
- **`upload`** — presigned upload flow, validation, enqueues transcoding
  jobs, publishes tracks into `catalog` on completion.
- **`streaming`** — resolves playback URLs (signed, expiring), records
  `PlayEvent`s for analytics.
- **`storage`** — internal module wrapping the object-storage port (S3 in
  cloud, MinIO locally) so no other module talks to AWS SDK directly.
- **`queue`** — wraps BullMQ setup/config; `upload` and future jobs use it
  rather than each module configuring Redis connections independently.

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

## Data flow: upload → publish

1. Artist requests an upload slot → `upload` module validates
   (auth, file type/size) and returns a presigned S3 PUT URL from `storage`.
2. Client uploads the raw audio file directly to S3 (never through our API
   process — avoids the API server ever buffering large file bodies).
3. Client confirms completion → `upload` enqueues a transcode job via
   `queue`.
4. A worker (same codebase, run as a separate process via a Nest
   standalone application context) transcodes to streaming-friendly
   bitrates, writes outputs back to `storage`, and on success creates the
   `Track` row in `catalog` with `status: 'published'`.
5. Failures leave the track in `status: 'processing'` or `'failed'` with a
   reason, visible to the artist — never silently dropped.

## Data flow: playback

1. Mobile app requests `resolvePlaybackUrl(trackId)` from `streaming`.
2. `streaming` checks the track's `source`, asks `storage` for a signed,
   short-TTL CloudFront URL (upload case) — or, in the future, calls a
   licensed-provider adapter (see `content-model.md`).
3. `streaming` records a `PlayEvent` (fire-and-forget, does not block the
   URL response).
4. Mobile app hands the URL to the native audio engine.

## AWS-readiness without AWS lock-in for local dev

- Local development runs Postgres, Redis, and MinIO via Docker Compose
  (`docker-compose.yml` at the repo root, added Phase 3) — no AWS account
  required to develop. Redis and MinIO are provisioned but not yet
  consumed by any module (no `queue` or `storage` module exists yet —
  those land with the `upload` module in a later phase).
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
  service methods (e.g. an artist can only edit their own tracks).
- Presigned URLs are short-TTL and scoped to a single object.
- Input validation via DTOs (`class-validator`) on every endpoint boundary.
- Secrets (DB credentials, JWT signing keys, AWS keys) come from environment
  variables / a secrets manager in production, never committed.
