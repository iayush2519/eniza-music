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
