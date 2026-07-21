# Technology Stack

Versions below were verified current as of **July 2026**. When starting a
new phase, spot-check for newer stable releases before adding a dependency,
but do not casually bump existing pinned versions mid-project without reason.

## Marketing site (`apps/web`)

| Concern | Choice | Version (baseline) | Why |
|---|---|---|---|
| Framework | Next.js | 15.5.20 (App Router) | Server Components, file-based routing/metadata APIs (`sitemap.ts`, `robots.ts`, `manifest.ts`), first-party Vercel deployment target. Pinned to the Next 15 line, not the Next 16 `latest` tag, to match this app's `react`/`react-dom` 19.2.x baseline and the rest of the brief's "Next.js 15" requirement. |
| Language | TypeScript | 5.9.3 (workspace catalog) | Same baseline as `packages/*`. |
| UI runtime | React | 19.2.3 | Matches `apps/mobile`'s React version, kept in step across the workspace even though this app has no shared-component dependency on mobile. |
| Styling | Tailwind CSS | 4.3.3 (CSS-first `@theme`, via `@tailwindcss/postcss`) | No `tailwind.config.js` — v4's config lives in `globals.css`. Chosen over v3 since v4 is current stable as of this phase. |
| Animation | Framer Motion | 12.42.2 | Scroll-triggered reveals, the hero's floating cards, FAQ accordion transitions. |
| Icons | Lucide React | 1.25.0 | Note: Lucide 1.0 removed all trademarked brand icons (GitHub/Twitter/etc. — see `lucide-icons/lucide#2792`); the footer's social links use generic icons instead. |
| Utility CSS merging | `clsx` + `tailwind-merge` | 2.1.1 / 3.6.0 | Standard pairing for a `cn()` helper (`src/lib/cn.ts`) that resolves conflicting Tailwind classes when a component's default classes are overridden by a caller. |
| Package manager | pnpm | 11.x (workspace-inherited) | Same workspace as every other app; no separate lockfile. |
| Monorepo tool | Turborepo | 2.x (workspace-inherited) | `build`/`lint`/`typecheck`/`dev` tasks match the existing `turbo.json` task graph — no new task types were needed. |

apps/web deliberately does not depend on `packages/design-system` (that
package's primitives are React Native components — see
`architecture/monorepo-structure.md`) or on `packages/api-client`/
`packages/shared-types` (apps/web has no backend integration in this
phase — see the "WAITLIST" scope note in `architecture/marketing-site.md`).
Visual identity is kept consistent with the ENIZA brand by hand-porting the
same brand hex values from `packages/design-system/src/tokens/colors.ts`
into `apps/web/src/app/globals.css`'s own `@theme` block, not via a shared
runtime import — see that file's own comment for why.

## Mobile app (`apps/mobile`)

| Concern | Choice | Version (baseline) | Why |
|---|---|---|---|
| Framework | Expo | SDK 57 (RN 0.86) | Managed native tooling, config plugins, EAS Build, OTA updates. New Architecture only. |
| Language | TypeScript | 5.7+ | Strict mode required. |
| Navigation | React Navigation | 7.21.x | Current stable major; v8 not yet released. |
| Server state | TanStack Query | 5.x | Cache, retries, revalidation for all network data. |
| Client/UI state | Zustand | 5.x | Ephemeral + persisted local state. |
| Animation | Reanimated | 4.x | UI-thread worklets; required by New Architecture. |
| Gestures | Gesture Handler | 3.x | Hook-based API, deep Reanimated integration. |
| Local relational data | expo-sqlite + Drizzle ORM | latest | Offline downloads metadata, typed schema/migrations. |
| Fast KV storage | MMKV | latest | Non-sensitive UI prefs and persisted Zustand slices. |
| Secrets | expo-secure-store | latest | Access/refresh tokens only. Never MMKV. |
| Audio engine | Custom native module on Media3/ExoPlayer | — | See `audio-engine.md`. Not RNTP (see ADR 0002). |
| Package manager | pnpm | 11.x (pinned via `packageManager`) | Workspaces, disk-efficient, strict by default. Uses `nodeLinker: hoisted` — see ADR 0008 for why, and for the pnpm v11 config-location pitfall it's tied to. |
| Monorepo tool | Turborepo | 2.x | Task caching/orchestration across apps/packages. |

## Backend (`apps/api`)

| Concern | Choice | Version (baseline) | Why |
|---|---|---|---|
| Framework | NestJS | 11.x | Modular, DI-based, mature ecosystem. v12 (ESM-only) not stable yet — do not adopt until GA. |
| Language | TypeScript | 5.7+ | Shared tsconfig base with mobile. |
| Primary DB | PostgreSQL | 16 | Relational integrity for catalog/library/users. |
| ORM | Drizzle ORM | latest | Same ORM family as mobile SQLite layer — one mental model for schema/migrations across the stack. |
| Cache / queues | Redis + BullMQ | latest | Sessions, rate limiting, transcoding job queue. |
| Object storage | S3-compatible interface | — | AWS S3 in cloud, MinIO locally. Abstracted behind a storage port (see backend-architecture.md). |
| CDN | CloudFront (signed URLs) | — | Streaming delivery, expiring URLs. |
| Auth | Passport + JWT (access + rotating refresh) | — | Standard, well-understood, easy to audit. |
| Validation | class-validator / class-transformer | latest | Nest-native DTO validation. |
| API docs | OpenAPI via @nestjs/swagger | latest | Also feeds typed `api-client` package generation. |

## Shared / cross-cutting

| Concern | Choice | Why |
|---|---|---|
| Shared types | `packages/shared-types` | Single source of truth for API DTOs consumed by both mobile and backend. |
| Design system | `packages/design-system` | Tokens + primitives, reused across current and future platforms. |
| Lint/format | ESLint + Prettier, shared base config in `packages/config` | Consistent style, one config to maintain. |
| CI | GitHub Actions | Typecheck, lint, test, build on PR. |
| Mobile build/distribution | EAS Build | Handles native builds without local Android/iOS toolchain requirements for CI. |
| IaC (later phase) | Terraform | AWS resources as code; not provisioned until the deployment phase. |

## Explicitly rejected / deferred

- **react-native-track-player v5** — commercially licensed as of the v5
  release (Apache-2.0 only through v4). See ADR 0002.
- **NestJS 12** — not GA, ESM-only migration is a breaking change we don't
  want to absorb mid-project.
- **React Navigation 8** — not released.
- **TypeScript 7.0 ("tsgo", Go-native compiler)** — released July 2026 with
  real speed benefits, but it's brand new, and both the Nest CLI and parts
  of the Expo/Metro toolchain have open compatibility issues with the
  TS 6/7 default changes (e.g. `baseUrl` deprecation) as of this writing.
  We pin to **TypeScript 5.9.3** (last fully-proven 5.x line) until the
  ecosystem (Nest CLI, Expo, Metro, ESLint tooling) confirms full support.
  Revisit this pin in a later phase.
- **Microservices backend** — premature; a modular monolith gives the same
  internal boundaries without the operational overhead. Can be split later
  if a module genuinely needs independent scaling.

## Known exception: `apps/mobile` TypeScript version

The Expo SDK 57 default template pins `typescript: ~6.0.3` (the version
Expo has tested SDK 57/Metro against) rather than our workspace baseline of
5.9.3. We keep the Expo-provided pin *inside `apps/mobile` only* rather than
forcing our baseline on it, since Metro/Expo tooling compatibility with a
specific TypeScript minor is more load-bearing than cross-workspace version
uniformity for this one app. `apps/api` and all `packages/*` use 5.9.3.

## Known exception: ESLint major version is not uniform across the workspace

`packages/*` and the workspace root run **ESLint 10.x** (pinned via the pnpm
catalog). `apps/mobile`, `apps/api`, and `apps/web` are pinned to **ESLint
9.x** instead, because each depends on packages that cap their ESLint peer
range at `^9.0.0` and have not published ESLint 10 support yet:

- `apps/mobile` uses `eslint-config-expo`, which depends on
  `eslint-plugin-import`, whose current release only declares support up to
  ESLint 9.
- `apps/api`'s Nest-CLI-generated config uses `eslint-plugin-prettier` /
  `eslint-config-prettier`, which are ESLint-10-compatible, but `@nestjs/cli`
  generates against ESLint 9 as of this Nest CLI release.
- `apps/web` uses `eslint-config-next` (pinned to the same `15.5.20` line as
  its `next` dependency, rather than the `next@16.x`-only latest release),
  whose dependency chain likewise caps ESLint support at `^9.0.0`.

This is a deliberate, documented exception rather than an accidental
mismatch: each app's ESLint version matches what its own first-party
tooling (Expo CLI, Nest CLI, Next.js's own `eslint-config-next`) generates
and tests against, and `pnpm why eslint` shows exactly two resolved versions
across the whole workspace, both intentional. Revisit this once
`eslint-plugin-import` and the Nest CLI templates support ESLint 10.

## Known exception: `apps/api` tsconfig is Nest-CLI-owned, not extended from `packages/config`

`apps/api/tsconfig.json` keeps the Nest CLI's generated compiler options
(`module: nodenext`, decorator metadata settings, etc.) rather than
extending `packages/config/tsconfig.base.json`. Nest's decorator-based DI
requires `emitDecoratorMetadata`/`experimentalDecorators` and a Node-style
module resolution that differs from the bundler-oriented settings the base
config uses for the frontend/mobile side. Forcing one shared tsconfig across
a Node backend and a Metro-bundled mobile app would fight both toolchains.
`strict` mode is still enabled in both, which is the property we actually
care about keeping consistent.

