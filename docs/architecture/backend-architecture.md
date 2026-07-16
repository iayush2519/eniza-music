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
  session/device tracking for revocation.
- **`users`** — profile data, preferences, role flags (listener/artist).
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

- Local development runs Postgres, Redis, and MinIO via Docker Compose —
  no AWS account required to develop.
- The `storage` module's adapter is selected by environment variable, not
  by code branching scattered through the codebase.
- Infra-as-code (Terraform) is written when the deployment phase starts,
  targeting: RDS (Postgres), ElastiCache (Redis), S3, CloudFront, and a
  container runtime (ECS Fargate is the default assumption — reassessed at
  that phase). None of this is provisioned yet.

## Security posture (summary — full detail in `security.md`)

- All mutating endpoints require auth; ownership checks are explicit in
  service methods (e.g. an artist can only edit their own tracks).
- Presigned URLs are short-TTL and scoped to a single object.
- Input validation via DTOs (`class-validator`) on every endpoint boundary.
- Secrets (DB credentials, JWT signing keys, AWS keys) come from environment
  variables / a secrets manager in production, never committed.
