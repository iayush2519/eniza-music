import type { AuthResponse, UserProfile } from '@music-app/shared-types';

/**
 * Response DTO for register/login/refresh. Explicit, hand-written shape
 * (not the raw Drizzle `User` row) so internal-only fields — most
 * importantly `passwordHash` — can never leak to a client, per
 * docs/architecture/security.md ("API responses use explicit DTOs on the
 * way out, not raw ORM entities").
 */
export class UserProfileDto implements UserProfile {
  id!: string;
  email!: string;
  displayName!: string;
  isArtist!: boolean;
}

export class AuthResponseDto implements AuthResponse {
  accessToken!: string;
  refreshToken!: string;
  user!: UserProfileDto;
}
