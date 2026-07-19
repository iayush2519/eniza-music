/**
 * Access-token payload. Deliberately minimal — `sub` (user id) is enough
 * for every guarded route to look up the current user via `UsersService`;
 * we do not embed role flags or other mutable user data in the token
 * itself, since that would require every route to trust stale claims
 * instead of the current DB state.
 */
export type AccessTokenPayload = {
  sub: string;
};

/**
 * Refresh-token payload additionally carries the session id, so
 * `/auth/refresh` can look up (and rotate/revoke) the exact session row
 * the token belongs to without a second lookup by user + device.
 *
 * `jti` (a random UUID, unique per issuance) is required — without it, two
 * refresh calls for the same session within the same second produce a
 * byte-identical JWT (since `iat` has 1-second resolution and `sub`/
 * `sessionId` are constant), which makes token "rotation" a no-op and
 * defeats the whole replay-detection mechanism in AuthService.refresh.
 */
export type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  jti: string;
};

/**
 * Short-lived token returned by `POST /auth/forgot-password/verify` after
 * a correct OTP, presented to `POST /auth/reset-password` to authorize
 * setting a new password without requiring the (about-to-be-forgotten)
 * old one. Signed with `JWT_ACCESS_SECRET` and a short, fixed 10-minute
 * expiry — deliberately not a new secret/config value, since this token
 * carries no more authority than a normal access token would (it does
 * not bypass password hashing or session logic) and reusing the existing
 * secret avoids growing the env-var surface for a narrow, single-purpose
 * token.
 *
 * `purpose` guards against a normal access token being presented here by
 * mistake (or a reset token being presented where an access token is
 * expected) — both are HS256 JWTs signed with the same secret, so without
 * a distinguishing claim they'd otherwise verify as interchangeable.
 *
 * `jti` is required per the standing rule in this file's own history (see
 * the `RefreshTokenPayload` doc comment above and ADR 0005): any new
 * token type must carry a per-issuance-unique claim, or two tokens issued
 * within the same second collide.
 */
export type PasswordResetTokenPayload = {
  sub: string;
  purpose: 'password_reset';
  jti: string;
};
