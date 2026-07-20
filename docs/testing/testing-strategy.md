# Testing Strategy

**Status: current as of Phase 6.2 (2026-07-20).** New document — testing
practices existed and were followed consistently, but were never written
down centrally; this consolidates the actual current setup and states the
plan for features not yet built.

## Current test suites (as they exist today)

### Backend (`apps/api`)

- **Unit tests** — `jest`, colocated `*.spec.ts` files next to the code
  they test (e.g. `auth/otp/otp.service.spec.ts`,
  `auth/password.service.spec.ts`, `auth/utils/parse-duration.spec.ts`,
  `app.controller.spec.ts`). Run via `pnpm --filter @music-app/api test`.
- **E2e tests** — `jest --config ./test/jest-e2e.json`, one file per
  domain area in `apps/api/test/`: `app`, `auth`, `catalog`, `library`,
  `metadata-refresh`, `music-gateway`, `playback`, `recommendations`,
  `search`, `users`. These exercise real HTTP requests against a real
  Nest application instance, with `DATABASE_CONNECTION` overridden to
  point at an embedded, WASM-compiled Postgres (`@electric-sql/pglite`)
  rather than a mock — the same committed SQL migrations used against
  real Postgres are applied first, so tests exercise actual SQL,
  constraints, and Drizzle query behavior. See `test/test-db.ts` and
  `backend-architecture.md`'s "Testing without Docker" section. **No
  Docker or running Postgres instance is required to run this suite.**

### Mobile (`apps/mobile`)

- **Unit tests** — `jest` (via `ts-jest`), colocated `*.spec.ts` files:
  `stores/auth-store.spec.ts`, `stores/playback-store.spec.ts`,
  `stores/sleep-timer-store.spec.ts`, `hooks/use-report-playback-progress.spec.ts`,
  `lib/greeting.spec.ts`. Run via `pnpm --filter @music-app/mobile test`.
- **No component/screen-level tests exist yet.** This project's test
  setup has no React-hook-rendering or component-rendering utility
  configured. Where a screen or hook has meaningful logic worth testing
  (e.g. `use-report-playback-progress`), that logic is deliberately
  extracted into a plain, directly-testable function rather than tested
  through a rendered component — this is the established pattern to
  follow for new features, not a gap to fill by adding a rendering
  library, unless a future feature's logic genuinely can't be extracted
  this way.

### Shared packages

- **`packages/audio-engine`** — unit tests for everything that doesn't
  require a real native module: `android-playback-engine.spec.ts`,
  `queue-item.spec.ts`, `stream-resolver.spec.ts`. The Kotlin native
  module itself has no automated test coverage from this JS-side suite —
  see "Native code testing" below.
- **`packages/design-system`, `packages/shared-types`, `packages/api-client`,
  `packages/config`** — no dedicated test suites recorded as of this
  review; these packages are exercised indirectly through the apps that
  consume them (typecheck failures on a shared-type drift, for instance,
  are caught at `apps/api`'s build time — see
  `module-dependencies.md`'s "Shared contract enforcement").

## Verification commands (current, run manually — no CI yet)

| Command | Scope |
|---|---|
| `pnpm turbo run typecheck` | Every app/package, root |
| `pnpm turbo run lint` | Every app/package, root |
| `pnpm turbo run test` | Every app/package's unit tests, root |
| `pnpm --filter @music-app/api test:e2e` | Backend e2e suite only |
| `cd apps/mobile/android && ./gradlew assembleDebug` | Full Android native build (only needed when native code, app config, or branding assets change) |

These are the same commands any future CI pipeline (Phase 6.4) should run
— see [`../deployment/ci-cd.md`](../deployment/ci-cd.md).

## Native code testing (a known, accepted limitation)

The Kotlin native module backing `AndroidPlaybackEngine`
(`packages/audio-engine/android/`) is not unit-testable from this
project's JS-side Jest suites. Verifying native changes requires either:
Xcode/Android-Studio-side native testing (not currently set up), or manual
on-device/emulator verification. This has been explicitly disclosed rather
than assumed covered every time native code has changed (e.g. the
repeat/shuffle/rate/reorder commit that added `AudioEngineModule.kt`
methods was flagged as "not verified by a Gradle build in this
environment" at the time). **This project's standard going forward:
native (Kotlin/Swift) changes are always disclosed as unverified-by-
automated-test unless a Gradle build and/or on-device run was actually
performed in the same session** — see "Project Standards" in
[`../README.md`](../README.md).

## Testing strategy for planned Phase 6.x work

| Feature | Backend tests | Mobile tests | Notes |
|---|---|---|---|
| **6.2 — Real OTP provider** *(done)* | Built: `email-otp-provider.spec.ts` (unit — mocked Nodemailer `createTransport`/`sendMail`; covers success, missing-`SMTP_HOST` error, retry-then-succeed, retry-exhaustion, secure/insecure transport config, auth-omitted-when-no-credentials); `otp-provider-selection.spec.ts` (integration — builds the real `AuthModule` graph, asserts the `ACTIVE_OTP_DELIVERY_PROVIDER` factory resolves to `EmailOtpProvider` vs. `ConsoleOtpProvider` for both `SMTP_HOST` states); `otp.service.spec.ts` and `auth.e2e-spec.ts` required no changes and still pass, confirming the interface swap-in claim held | None needed | Confirmed a swap-in, not a new interface, as planned |
| **6.3 — Settings** | New `settings.service.spec.ts` (unit) + `settings.e2e-spec.ts` (get/update, auth-scoped), following the `library.e2e-spec.ts` pattern | New `settings-store.spec.ts` (Zustand, mocked api-client), following `auth-store.spec.ts`'s pattern | Screen itself is presentation-only; extract logic into a testable function per the established pattern |
| **6.4 — CI/CD** | N/A (infra) | N/A (infra) | Should run every command in the table above on every PR before merge is allowed |
| **6.5 — QA & security hardening** | Add negative-path e2e tests (invalid tokens, expired sessions, malformed input) to existing suites; `pnpm audit` (or equivalent) in CI | Manual/documented a11y audit against design-system components (WCAG requires manual testing with assistive technology — automated checks alone are not sufficient, see `security.md`) | Adds tests to *existing* modules rather than a new module |
| **6.6 — Offline downloads** | New e2e coverage if any backend range-request/streaming-resume behavior is added | Unit tests for the download manager's state machine (queued/downloading/complete/failed), mocked file-system + network; manual on-device verification for actual storage behavior (not automatable in this environment) | Native storage interaction should be isolated behind a testable interface, matching `PlaybackEngine`'s existing contract pattern |
| **6.7 — iOS playback engine** | N/A (mobile-native) | Mirror `android-playback-engine.spec.ts`'s test shape for the new iOS implementation wherever platform-independent logic allows it (`queue-item.spec.ts`/`stream-resolver.spec.ts` already run cross-platform) | The native Swift code itself requires Xcode-side testing or manual device verification — same disclosed-limitation rule as Android's Kotlin code |
| **6.8 — Motion & polish** | N/A | Manual/visual verification (motion is inherently not unit-testable); extract any timing/easing logic into plain functions if it needs coverage | Follows the existing extraction pattern |
| **6.9 — Notifications** | New `notifications.service.spec.ts` + e2e for device-token registration/delivery-trigger logic | New store/hook tests, mocked `expo-notifications` | Requires a new dependency not currently installed — flag as a new install, not silent |

## Rules

1. Every new backend module gets both unit tests (for non-trivial service
   logic) and e2e coverage (for the actual HTTP surface), matching every
   existing module's pattern.
2. Every new mobile store gets a `*.spec.ts` following the existing
   mocking pattern (`@/lib/api-client` mocked directly, not the underlying
   `fetch`).
3. Logic that would otherwise only be reachable by rendering a component
   is extracted into a plain function first, then tested directly — this
   project does not add a component-rendering test utility as a
   workaround.
4. Native (Kotlin/Swift) changes are disclosed as unverified-by-automated-
   test unless an actual build/device run was performed in the same
   session.
5. No milestone is considered complete without running (at minimum)
   `typecheck`, `lint`, and `test` for every affected app/package — see
   "Project Standards" in [`../README.md`](../README.md).
