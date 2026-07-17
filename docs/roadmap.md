# Roadmap

Phases are delivered one at a time. Each phase must build/run and be
explicitly approved before the next phase starts.

- [x] **Phase 0 — Analysis & architecture.** Stack chosen, risks identified,
  content model and audio engine decisions made. See `decisions/` and
  `architecture/`.
- [x] **Phase 1 — Monorepo scaffold.** Turborepo + pnpm workspaces, shared
  config package, empty `apps/mobile` (Expo) and `apps/api` (NestJS) that
  build and run, empty `packages/*` stubs wired up.
- [x] **Phase 2 — Design system foundations.** Tokens, theming, core
  primitives (Text, Button, Surface, VStack/HStack) built in
  `packages/design-system` and wired into `apps/mobile` as a real
  dependency (placeholder screens only — no feature UI yet). See
  `docs/architecture/design-system.md` and
  `decisions/0004-design-system-visual-identity.md`.
- [x] **Phase 3 — Backend core.** `auth` + `users` modules, Postgres schema
  via Drizzle, Docker Compose for local Postgres/Redis/MinIO. See
  `docs/architecture/backend-architecture.md` and
  `decisions/0005-auth-token-strategy.md`.
- [x] **Phase 4 — Catalog & library domain.** Tracks/albums/playlists CRUD,
  seed data, mobile screens consuming it via TanStack Query. *(Its
  upload-platform content model was later superseded — see the
  2026-07-19 status log entry and `decisions/0007-provider-backed-music-catalog.md`
  — but the phase's delivered module/library/mobile patterns stand.)*
- [ ] **Phase 4.5 — Provider-backed catalog pivot.** Replace the owned
  upload-based catalog with a `MusicProvider`/`MusicGateway` abstraction;
  repurpose `artists`/`albums`/`tracks` as a local metadata cache with
  background refresh; add search/listening history, recommendations, and
  settings. See `music-provider-architecture.md`.
- [ ] **Phase 5 — Audio playback engine.** `packages/audio-engine` native
  module (Media3/ExoPlayer + Expo config plugin), mini-player + full-player
  UI, queue management. Now plays provider-resolved stream URLs instead of
  self-hosted ones (no change to the engine's own interface).
- [ ] **Phase 6 — Offline & downloads.** SQLite (Drizzle) schema, download
  manager, background task handling.
- [ ] **Phase 7 — Motion & polish pass.** Reanimated transitions, gesture
  interactions, the "premium feel" layer (dynamic accent color, etc.).
- [ ] **Phase 8 — QA & security hardening.** Auth flow review, input
  validation audit, secrets audit, accessibility pass, rate limiting,
  dependency scanning.
- [ ] **Phase 9 — CI/CD & deployment shape.** GitHub Actions, EAS builds,
  Terraform for AWS resources (RDS, ElastiCache, S3, CloudFront, ECS
  Fargate — reassessed at this phase).

## Status log

- **2026-07-16** — Phase 0 complete. User confirmed: upload-platform content
  model with future licensed-provider extensibility; custom Media3/ExoPlayer
  audio engine over RNTP; production-quality portfolio scope (no
  enterprise-scale infra, payments, or multi-region in initial release).
  Phase 1 started.
- **2026-07-16** — Phase 1 complete and audited (dead-code/duplicate-config
  cleanup, pnpm catalog introduced, Node/toolchain versions verified
  current). Phase 2 complete: `packages/design-system` built (tokens,
  theme, `Text`/`Surface`/`VStack`/`HStack`/`Button` primitives) and wired
  into `apps/mobile` as a real workspace dependency, replacing the local
  ad hoc theme/themed-* files from the Expo template. Cross-package Metro
  resolution verified end to end (iOS/Android/web bundles, live web
  render).
- **2026-07-17** — Phase 3 complete: `auth` + `users` modules, Drizzle
  schema/migrations against Postgres, Docker Compose for local
  Postgres/Redis/MinIO. A real refresh-token rotation bug (byte-identical
  tokens when two refreshes landed in the same second, defeating replay
  detection) was found via direct in-process investigation, fixed (`jti`
  claim added), and covered by permanent regression tests. Full e2e suite
  runs against an embedded Postgres-compatible test database
  (`@electric-sql/pglite`), no Docker required for CI. See
  `decisions/0005-auth-token-strategy.md`.
- **2026-07-18** — Phase 4 complete: `catalog` (public, read-only) and
  `library` (authenticated, ownership-scoped) backend modules, Drizzle
  schema for artists/albums/tracks/playlists/playlist_tracks/
  library_entries, idempotent seed script against freely licensed sample
  audio, `packages/shared-types` (backend DTOs `implements` the shared
  contracts) and `packages/api-client`. Mobile: minimal auth UI (login/
  register, `expo-secure-store` token storage, Zustand session state),
  Expo Router `Stack.Protected`-based route guarding, and Home/Explore/
  Library screens wired to real catalog/library data via TanStack Query.
  38 backend e2e tests + 19 unit tests passing; full workspace typecheck/
  lint/build clean. See `docs/architecture/catalog-and-library.md` and
  `decisions/0006-mobile-route-guarding.md`.
- **2026-07-19** — Product direction changed before Phase 5 started: the
  app is now a provider-backed premium streaming client (Apple Music/
  Spotify-inspired, original identity), not an independent-artist upload
  platform. Design reviewed and approved with revisions: `artists`/
  `albums`/`tracks` are **kept** and repurposed as a local metadata cache
  (not dropped); a `MusicGateway` sits between backend modules and
  `MusicProvider` adapters; playlists/library keep referencing local
  cache-table ids rather than raw provider ids; `users.isArtist` is left
  unchanged; background metadata refresh is added for stale cache rows;
  recommendations are driven primarily by our own behavioral data
  (history/likes/playlists/searches/skips/repeats) with provider
  "related tracks" as optional enrichment only; Home remains the
  personalized landing page (not replaced by Search). Documented in
  `decisions/0007-provider-backed-music-catalog.md` and
  `music-provider-architecture.md`; `content-model.md`,
  `catalog-and-library.md`, `backend-architecture.md`, `overview.md`, and
  `security.md` updated to point at the new design. **No code has been
  written yet — this is a design-only update, awaiting approval before
  implementation (tracked as Phase 4.5 above).**
