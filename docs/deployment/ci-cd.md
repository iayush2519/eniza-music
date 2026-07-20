# CI/CD

**Status: current as of Phase 6.2 (2026-07-20).** New document. **No CI/CD
pipeline exists.** There is no `.github/workflows` directory anywhere in
this repository. This document states that clearly, explains the
consequence, and describes the planned pipeline (Phase 6.4) without
implying any part of it has been built.

## Current state: manual verification only

Every merge to `master` to date has relied entirely on whoever performed
the change running verification commands locally (or in a working
session) — there is no automated gate. This was flagged as a real
consequence, not a hypothetical one, in
[ADR 0008](../decisions/0008-pnpm-v11-hoisted-linker-required.md)'s
"Follow-up / flagged for future work" section: a CI job running `pnpm
install` on a matrix including Windows would have caught that ADR's root
cause (a pnpm-v11 config-location change silently dropping the
`nodeLinker` setting) automatically, instead of requiring someone to hit a
broken native build locally first.

## What "verification" currently means (see also `../testing/testing-strategy.md`)

```
pnpm turbo run typecheck
pnpm turbo run lint
pnpm turbo run test
pnpm --filter @music-app/api test:e2e
```

...plus, when native code / `app.json` / branding assets change:

```
cd apps/mobile/android && ./gradlew.bat assembleDebug
```

These commands are run manually. Nothing enforces that they were actually
run before a merge.

## Planned pipeline (Phase 6.4 — not built yet)

A GitHub Actions workflow (`.github/workflows/ci.yml`, to be created) that
runs on every pull request and push to `master`:

1. **Setup** — checkout, pnpm install (respecting the pinned
   `packageManager` field and `pnpm-workspace.yaml`'s `nodeLinker:
   hoisted` setting — see ADR 0008; a Windows runner in the matrix would
   directly guard against ADR 0008's exact failure class recurring).
2. **Typecheck** — `pnpm turbo run typecheck`.
3. **Lint** — `pnpm turbo run lint`.
4. **Unit tests** — `pnpm turbo run test`.
5. **Backend e2e tests** — `pnpm --filter @music-app/api test:e2e` (no
   Docker/Postgres needed — runs against embedded `pglite`, so this step
   has no external service dependency).
6. **Mobile build check** — `pnpm --filter @music-app/mobile build`
   (`expo export`) to catch bundling-level breakage without requiring a
   full native build on every PR.
7. *(Deferred, not part of the initial Phase 6.4 scope)* — a full Android
   `gradlew assembleDebug` job, since it's the slowest step (~3-4 minutes
   observed locally) and native code changes less frequently than JS/TS;
   candidate for a path-filtered job that only runs when
   `packages/audio-engine/android/**` or `apps/mobile/app.json` changes.
8. *(Deferred)* — dependency vulnerability scanning (`pnpm audit` or
   equivalent), tracked alongside Phase 6.5 (QA & security hardening)
   rather than as part of the initial pipeline stand-up.

## Production secrets required for `apps/api` (Phase 6.2 addition)

Beyond the existing required secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`), any real deployment must also configure SMTP so
`EmailOtpProvider` is selected instead of `ConsoleOtpProvider` (see
`../architecture/backend-architecture.md`'s "OTP delivery" section):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_FROM_ADDRESS`. Without `SMTP_HOST` set, a production deployment
would silently fall back to logging OTP codes via `Logger` instead of
emailing them — no startup error, since these vars are deliberately
optional (so local dev/tests are unaffected), but a real functional gap
for real users. Whichever secrets-management approach a future deployment
phase adopts (AWS Secrets Manager, SSM Parameter Store, etc. — see
`backend-architecture.md`'s "AWS-readiness" section) must include these
alongside the JWT secrets.

## Explicitly not planned yet

- **EAS Build integration** — see [`android.md`](./android.md)/[`ios.md`](./ios.md).
  No `eas.json` exists; CI running lint/test/typecheck is a separate,
  earlier concern from automated app builds/distribution.
- **Automated deployment of `apps/api`** — no hosting target has been
  selected yet (see `backend-architecture.md`'s "AWS-readiness without
  AWS lock-in" section — Terraform/AWS provisioning is deferred to a later
  phase, reassessed once Phase 6.4–6.6 land).
- **A lint rule enforcing the `packages/` → `apps/` dependency-direction
  rule** — currently verified only by manual inspection (see
  `module-dependencies.md`'s "Known gaps"); a natural addition once CI
  exists to run it.

## Why this is prioritized (Phase 6.4, High priority)

Every phase completed so far has added more surface area with zero
automated regression protection. The longer this gap persists, the larger
the blast radius of a single missed local-verification step becomes. This
is explicitly sequenced before the larger remaining feature work (offline
downloads, iOS parity) in the roadmap for that reason — see
[`../roadmap.md`](../roadmap.md)'s Phase 6.x ordering.
