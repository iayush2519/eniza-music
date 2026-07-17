# ADR 0005: Auth token strategy — JWT access + DB-backed rotating refresh sessions

**Status:** Accepted
**Date:** 2026-07-17

## Context

Phase 3 required a real `auth` module per `docs/architecture/backend-architecture.md`
and the security baseline in `docs/architecture/security.md`, which already
commits to "JWT access tokens (short-lived) + rotating refresh tokens
(longer-lived, invalidated on rotation to limit replay window)." This ADR
records the concrete implementation of that commitment and a correctness
issue found and fixed while building it.

## Decision

- **Access tokens** are short-lived (15m default), stateless JWTs signed
  with `JWT_ACCESS_SECRET`, carrying only `{ sub: userId }`. Every guarded
  route re-fetches the user from the DB via `JwtAccessStrategy.validate`
  rather than trusting stale claims — a deactivated account is rejected
  immediately, not just once the token expires.
- **Refresh tokens** are JWTs signed with a *different* secret
  (`JWT_REFRESH_SECRET`) and a longer lifetime (30d default), but are not
  purely stateless: each one is bound to a row in a `sessions` table that
  stores an argon2 hash of the current refresh token (never the token
  itself). `/auth/refresh` validates the presented token against that
  hash, then rotates it — the old token's hash is overwritten, so it can
  never be presented again.
- **Replay detection**: if a presented refresh token fails to match the
  session's current hash (i.e. it's a previously-rotated, now-stale
  token), the session is revoked outright rather than just rejecting that
  one request. This treats a stale-token replay as a signal of possible
  token theft, not a benign race condition.
- **Password hashing** uses `@node-rs/argon2` (Argon2id, OWASP's
  recommended variant) for both user passwords and the stored refresh-token
  hashes — reusing the same primitive rather than introducing a second
  hashing library for one specific case.

## Correctness issue found during implementation: refresh-token collision

While verifying the refresh flow (see "Investigation" below), two refresh
calls issued within the same wall-clock second produced a **byte-identical
JWT**. `RefreshTokenPayload` originally carried only `{ sub, sessionId }`,
both constant across a refresh call, and a JWT's `iat` claim has 1-second
resolution — so signing the "new" token with an unchanged payload within
the same second reproduced the exact same signature. This made token
"rotation" a no-op: the DB hash was overwritten with a hash of a token
that was, bit for bit, the same as the one just replaced, so presenting
the "old" token again still validated successfully — replay detection
was silently defeated.

**Fix:** added a `jti` (JWT ID) claim — a fresh `randomUUID()` on every
call to `signRefreshToken` — guaranteeing every issued refresh token is
unique regardless of timing. See `src/auth/types/jwt-payload.type.ts` for
the documented rationale kept alongside the type itself.

### Investigation trail (why this was confirmed as a real bug, not a test artifact)

The behavior first surfaced while manually exercising `/auth/refresh`
against a temporary PGlite-backed Postgres substitute used during
development (no Docker available in this environment). Because that
substitute has its own known quirks (a documented single-connection
default), the natural first hypothesis was a test-environment artifact,
not application logic. This was verified rather than assumed:

1. Reproduced with `postgres()` pool size forced to `1` — same result,
   ruling out connection-pool round-robin as the cause.
2. Confirmed Drizzle's query cache was never enabled (`global: false` is
   the default, and it isn't set anywhere in this codebase) — ruling out
   stale cached reads.
3. Reproduced by calling `AuthService.refresh()` **directly**, via
   `NestFactory.createApplicationContext`, entirely bypassing HTTP, the
   PGlite substitute's socket layer, and any test harness — confirming
   the bug lived in application code, specifically in JWT payload
   construction.
4. After the `jti` fix, re-ran the same direct reproduction, the full HTTP
   flow, and a 4-step legitimate sequential refresh chain — all now behave
   correctly, and the fix is covered by permanent regression tests (see
   `test/auth.e2e-spec.ts`, "produces a different refresh token on every
   call" and "rejects a replayed... token").

## Alternatives considered

- **Fully stateless refresh tokens (no DB session row).** Rejected: makes
  "logout" and "sign out of all devices" impossible to implement correctly
  — a stateless token remains valid until it expires no matter what the
  server does. The security baseline explicitly requires revocation.
- **Storing the raw refresh token in the DB instead of a hash.** Rejected:
  a DB read (via a compromised query, backup leak, etc.) would directly
  yield usable tokens. Hashing costs one extra argon2 call per refresh and
  removes that entire risk class.
- **Session id embedded in the URL/header instead of the JWT payload.**
  Rejected: would require an extra round-trip or client-side bookkeeping
  the JWT approach avoids entirely — the session id is already
  cryptographically bound to the token via the signature.

## Consequences

- Every `sessions` row is a real, queryable audit trail of active
  device/session state per user — the foundation for a future "manage
  your devices" feature (already anticipated in
  `docs/architecture/backend-architecture.md`).
- Refresh calls cost one extra DB round-trip (session lookup + rotation)
  compared to a fully stateless design — an accepted, deliberate tradeoff
  for real revocation support.
- Any future token type added to this system (e.g. a password-reset token)
  must include a `jti` or equivalent uniqueness guarantee from the start —
  this is now a standing rule, not just a one-off fix, and is called out
  explicitly in the `RefreshTokenPayload` type's own doc comment so it's
  visible at the point of use, not just in this ADR.
