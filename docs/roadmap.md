# Roadmap

Phases are delivered one at a time. Each phase must build/run and be
explicitly approved before the next phase starts.

**This document is the single authoritative source for project status.**
It is kept in sync with the actual codebase at the end of every phase — not
just checked off from memory. If this document and the code ever disagree,
that is a bug in this document, and it should be corrected (with a status
log entry explaining what was wrong) rather than left stale. See ADR
[0009](decisions/ADR-0009-phase6-roadmap.md) for why a dedicated
synchronization step was introduced as a permanent part of the workflow.

## Phase status

- [x] **Phase 0 — Analysis & architecture.** Stack chosen, risks identified,
  content model and audio engine decisions made. See `decisions/` and
  `architecture/`.
- [x] **Phase 1 — Monorepo scaffold.** Turborepo + pnpm workspaces, shared
  config package, empty `apps/mobile` (Expo) and `apps/api` (NestJS) that
  build and run, empty `packages/*` stubs wired up.
- [x] **Phase 2 — Design system foundations.** Tokens, theming, core
  primitives (Text, Button, Surface, VStack/HStack) built in
  `packages/design-system` and wired into `apps/mobile` as a real
  dependency.
- [x] **Phase 3 — Backend core.** `auth` + `users` modules, Postgres schema
  via Drizzle, Docker Compose for local Postgres/Redis/MinIO.
- [x] **Phase 4 — Catalog & library domain.** Tracks/albums/playlists CRUD,
  seed data, mobile screens consuming it via TanStack Query. *(Its original
  upload-platform content model was superseded by Phase 4.5 — see
  `decisions/0007-provider-backed-music-catalog.md` — but the module/
  library/mobile patterns delivered here stand unchanged.)*
- [x] **Phase 4.5 — Provider-backed catalog pivot.** Replaced the
  upload-based catalog with a `MusicGateway`/`MusicProvider` abstraction
  (`apps/api/src/discovery`); `artists`/`albums`/`tracks` repurposed as a
  local metadata cache with background refresh (`apps/api/src/queue`);
  `GET /search`, `listening_history`/`search_history` tables, and a
  behavioral-first `recommendations` module all built and e2e-tested. See
  `music-provider-architecture.md`.
- [x] **Phase 5 — Audio playback engine.** `packages/audio-engine`'s
  `PlaybackEngine` contract has a real Android implementation
  (`AndroidPlaybackEngine`, backed by a Media3/ExoPlayer native module at
  `packages/audio-engine/android`) — repeat, shuffle, playback rate, and
  native queue reordering all implemented. Full mobile UI built on top:
  mini-player, Full Player, Queue sheet, Lyrics screen, Sleep Timer, and
  Album/Artist/Playlist detail screens. Also delivered in this phase:
  email OTP verification and forgot/reset-password flows (backend +
  mobile), closing a gap in the original auth work. **Not yet done:** an
  iOS (AVPlayer-backed) implementation of `PlaybackEngine` — tracked as
  Phase 6.7 below.
- [x] **Phase 5.6 — Branding integration.** ENIZA Branding Assets v1.0
  (icon, splash, favicon, logo lockups) wired into `apps/mobile/app.json`;
  superseded placeholder assets removed. See
  [`branding/branding-v1.md`](branding/branding-v1.md).
- [x] **Phase 6.0 — Roadmap & architecture planning.** Full-codebase
  review producing a prioritized plan for all remaining work (see the
  "Phase 6.x" breakdown below), without implementing anything.
- [x] **Phase 6.1 — Documentation & roadmap synchronization.** This
  document and `docs/architecture/*`, `docs/testing/*`,
  `docs/deployment/*`, `docs/branding/*` brought in line with the actual
  current codebase; permanent project standards and a Technical Debt
  register established. See
  [ADR 0009](decisions/ADR-0009-phase6-roadmap.md).
- [x] **Phase 6.2 — Real OTP delivery provider.** Added `EmailOtpProvider`
  (`apps/api/src/auth/otp/email-otp-provider.ts`), a Nodemailer/SMTP
  implementation of `OtpDeliveryProvider`, selected by
  `ACTIVE_OTP_DELIVERY_PROVIDER`'s factory in `auth.module.ts` when
  `SMTP_HOST` is configured. `ConsoleOtpProvider` remains the default for
  local dev and every test (no SMTP config set). See
  `architecture/backend-architecture.md`'s OTP delivery section.
- [ ] **Phase 6.3 — Settings & preferences.** *(High priority.)* Backend
  `settings` module for the already-modeled `settings` table
  (`explicitContentEnabled`, `autoplayEnabled`) plus a mobile settings
  screen and basic account management (change password, sign out of all
  devices, delete account).
- [ ] **Phase 6.4 — CI/CD pipeline.** *(High priority.)* GitHub Actions
  running `turbo run lint/typecheck/test` and `apps/api`'s `test:e2e` on
  every PR. No `.github/workflows` exists today — every merge currently
  relies on local verification only. See
  [`deployment/ci-cd.md`](deployment/ci-cd.md).
- [ ] **Phase 6.5 — QA & security hardening.** *(High priority.)* Auth flow
  review, input validation audit, secrets audit, accessibility pass, rate
  limiting (especially on `GET /search`, which proxies to a rate-limited
  external provider), dependency vulnerability scanning.
- [ ] **Phase 6.6 — Offline & downloads.** *(Medium priority.)* On-device
  SQLite (Drizzle) schema, download manager, background task handling.
  *(Formerly "Phase 6" in the original numbering — see ADR 0009 for why it
  moved.)*
- [ ] **Phase 6.7 — iOS playback engine parity.** *(Medium priority.)* An
  AVPlayer-backed implementation of the existing `PlaybackEngine`
  interface (`packages/audio-engine`) — the contract was designed for
  this from the start (see `architecture/playback-engine.md`), but no iOS
  implementation exists yet.
- [ ] **Phase 6.8 — Motion & polish pass.** *(Medium priority.)* Reanimated
  transitions, gesture interactions, the "premium feel" layer (dynamic
  accent color derived from now-playing artwork, etc.). *(Formerly
  "Phase 7.")*
- [ ] **Phase 6.9 — Notifications.** *(Low–Medium priority, scope to be
  reconfirmed.)* Push/in-app notifications for new releases, playlist
  updates, etc. Requires a new `expo-notifications` dependency and a new
  backend module — neither exists today.
- **Not scheduled** — require an explicit product-scope decision before
  being added to this roadmap: social features (user-to-user following,
  activity feed, sharing), monetization/subscriptions, admin/CMS content
  tooling. See the Technical Debt sections in
  [`architecture/system-overview.md`](architecture/system-overview.md) and
  [`architecture/backend-architecture.md`](architecture/backend-architecture.md)
  for why each remains out of scope.

Deployment shape (Terraform for AWS resources — RDS, ElastiCache, S3,
CloudFront, ECS Fargate) is reassessed once Phase 6.4–6.6 land, per
`architecture/backend-architecture.md`'s "AWS-readiness without AWS
lock-in" section — nothing is provisioned yet.

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
  platform. Documented in `decisions/0007-provider-backed-music-catalog.md`
  and `music-provider-architecture.md`. Design-only update at this point —
  implementation tracked as Phase 4.5.
- **2026-07-19/20** — Phase 4.5 completed: `discovery` module
  (`MusicGateway`, `MusicProvider` interface, `MockProvider`, a Jamendo
  adapter selected by configuration), `GET /search`, background metadata
  refresh via the `queue` module (BullMQ when `REDIS_URL` is set, an
  inline in-process fallback otherwise — see `queue.module.ts`), and a
  behavioral-first `recommendations` module (`continue-listening`,
  `recently-played`, `for-you`, `because-you-liked`, `trending`). Mobile
  Home screen rebuilt as a full curated feed against
  `GET /recommendations`, with paginated New Releases and
  playback-progress reporting feeding `listening_history`.
- **2026-07-20** — Phase 5 completed: `packages/audio-engine` gained its
  first real implementation (`AndroidPlaybackEngine` + a Media3/ExoPlayer
  Kotlin native module), with repeat/shuffle/playback-rate/native
  queue-reorder support added after the initial load/play/pause/seek/skip
  contract. Full Player, Queue sheet, Lyrics screen, and Sleep Timer UI
  built on top, along with Album/Artist/Playlist detail screens. Email OTP
  verification and forgot/reset-password flows were added in the same
  phase window (backend `otp` module + mobile `verify-otp`/
  `forgot-password`/`reset-password` screens), closing a gap left open
  since Phase 3. A round of UI bugfixes followed (search keyboard
  behavior, share action, sleep-timer persistence, volume control,
  drag-to-seek, album save).
- **2026-07-20** — Phase 5.6 completed: ENIZA Branding Assets v1.0
  (`assets/app-icon`, `assets/branding/logo`, `assets/favicon`,
  `assets/splash`) wired into `apps/mobile/app.json` (app icon, Android
  adaptive icon foreground/monochrome, web favicon, splash screen);
  superseded placeholder assets (Expo default icon/splash/favicon, unused
  iOS Icon Composer bundle) removed. Verified via typecheck, lint, Jest,
  and a full Android debug build (`gradlew assembleDebug`).
- **2026-07-20** — Phase 6.0 completed: full-codebase review producing a
  prioritized roadmap for all remaining work (this document's "Phase 6.x"
  section is that plan, formalized).
- **2026-07-20** — Phase 6.1 completed: this document and the
  `docs/architecture/`, `docs/testing/`, `docs/deployment/`,
  `docs/branding/` trees brought in line with the actual current
  codebase (see ADR 0009 for the full rationale, and the Technical Debt
  sections added to `architecture/system-overview.md` and
  `architecture/backend-architecture.md` for what's known-incomplete
  going forward). No application code, UI, or branding assets were
  touched in this phase — documentation only.
- **2026-07-20** — Phase 6.2 completed: `EmailOtpProvider`
  (`apps/api/src/auth/otp/email-otp-provider.ts`) added as a production
  `OtpDeliveryProvider` implementation, sending OTP codes over SMTP via
  Nodemailer (pinned exact at `9.0.3`, plus `@types/nodemailer` as a dev
  dependency). New optional env vars (`SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`) added
  to `env.validation.ts`/`.env.example`, all `@IsOptional` so local dev
  and every test environment are unaffected. `auth.module.ts`'s
  `ACTIVE_OTP_DELIVERY_PROVIDER` factory now selects `EmailOtpProvider`
  when `SMTP_HOST` is set, `ConsoleOtpProvider` otherwise — no change to
  `OtpService`, `AuthService`, `AuthController`, or the public auth API.
  `EmailOtpProvider` retries transient SMTP failures (up to 3 attempts)
  before throwing. Added `email-otp-provider.spec.ts` (unit, mocked
  Nodemailer transport) and `otp-provider-selection.spec.ts` (integration,
  builds the real `AuthModule` graph to confirm the factory picks the
  right provider for both configuration states); `otp.service.spec.ts`
  and `auth.e2e-spec.ts` required no changes and still pass. Full
  verification: typecheck/lint clean, unit Jest 9/9 suites (62/62 tests),
  e2e Jest 9/9 relevant suites (82/82 tests) passing — the one failing
  e2e suite, `metadata-refresh.e2e-spec.ts`, was confirmed via `git
  stash` to fail identically before this change (a pre-existing
  BullMQ/timing issue, unrelated to OTP delivery, out of scope here).
