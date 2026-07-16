# Security Baseline

This document tracks security decisions made from the start of the project.
It will grow during the dedicated QA & security hardening phase, but the
baseline below applies from Phase 1 onward.

## Secrets

- No secrets are ever committed. `.env` files are gitignored;
  `.env.example` files (no real values) document required variables.
- Mobile app secrets (access/refresh tokens) live exclusively in
  `expo-secure-store`. Never in MMKV, never in Zustand-persisted state,
  never in plain SQLite columns.
- Backend secrets (DB credentials, JWT signing keys, S3/AWS credentials)
  come from environment variables locally and a secrets manager in any
  real deployment — never hardcoded.

## Auth

- JWT access tokens (short-lived) + rotating refresh tokens (longer-lived,
  invalidated on rotation to limit replay window).
- Passwords hashed with a modern adaptive hash (argon2 or bcrypt with a
  sufficient cost factor) — never stored plain or with a fast general-
  purpose hash.
- Every mutating endpoint requires authentication; ownership is checked
  explicitly in service logic (e.g. an artist can only mutate their own
  tracks) rather than assumed from the route shape.

## Input handling

- All DTOs validated at the API boundary via `class-validator`; unknown
  properties stripped (`whitelist: true` on the global validation pipe).
- File uploads validated by content type and size before a presigned URL
  is issued; the API process itself never buffers the uploaded file body.
- All Postgres access goes through Drizzle's parameterized query builder —
  no raw string-interpolated SQL.

## Data exposure

- Playback URLs are short-TTL, signed, and scoped to a single object —
  never a long-lived or guessable URL to raw audio.
- API responses use explicit DTOs on the way out, not raw ORM entities, so
  internal-only fields never leak to clients.

## Transport

- All API traffic over HTTPS/TLS in any real deployment. Local dev may use
  plain HTTP against localhost only.

## Dependency hygiene

- Dependencies pinned to exact or narrowly-ranged versions, not open
  ranges.
- Before adding a new dependency: verify it's actively maintained, has a
  reasonable download/usage footprint, and isn't a plausible typosquat of a
  more common package name.

## Deferred to the QA & security hardening phase

- Formal accessibility review (WCAG requires manual testing with assistive
  technology, not just automated checks — flagged here so it isn't
  forgotten).
- Rate limiting / abuse prevention on public endpoints.
- Dependency vulnerability scanning in CI.
- Content moderation workflow for uploaded audio.
