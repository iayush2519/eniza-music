/**
 * The authenticated user's own profile, as returned by the auth
 * endpoints. Deliberately excludes internal-only fields (password hash) —
 * mirrors apps/api/src/auth/dto/auth-response.dto.ts's `UserProfileDto`.
 */
export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  isArtist: boolean;
  /** True once the account has completed email OTP verification (see
   * apps/api/src/database/schema/users.schema.ts). */
  emailVerified: boolean;
};
