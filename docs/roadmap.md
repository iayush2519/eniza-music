# Roadmap

Phases are delivered one at a time. Each phase must build/run and be
explicitly approved before the next phase starts.

- [x] **Phase 0 — Analysis & architecture.** Stack chosen, risks identified,
  content model and audio engine decisions made. See `decisions/` and
  `architecture/`.
- [ ] **Phase 1 — Monorepo scaffold.** Turborepo + pnpm workspaces, shared
  config package, empty `apps/mobile` (Expo) and `apps/api` (NestJS) that
  build and run, empty `packages/*` stubs wired up. *(in progress)*
- [x] **Phase 2 — Design system foundations.** Tokens, theming, core
  primitives (Text, Button, Surface, VStack/HStack) built in
  `packages/design-system` and wired into `apps/mobile` as a real
  dependency (placeholder screens only — no feature UI yet). See
  `docs/architecture/design-system.md` and
  `decisions/0004-design-system-visual-identity.md`.
- [ ] **Phase 3 — Backend core.** `auth` + `users` modules, Postgres schema
  via Drizzle, Docker Compose for local Postgres/Redis/MinIO.
- [ ] **Phase 4 — Catalog & library domain.** Tracks/albums/playlists CRUD,
  seed data, mobile screens consuming it via TanStack Query.
- [ ] **Phase 5 — Audio playback engine.** `packages/audio-engine` native
  module (Media3/ExoPlayer + Expo config plugin), mini-player + full-player
  UI, queue management.
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
