import { UserProfile } from '../domain/user';

/** Mirrors apps/api/src/auth/dto/register.dto.ts. */
export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

/** Mirrors apps/api/src/auth/dto/login.dto.ts. */
export type LoginRequest = {
  email: string;
  password: string;
};

/** Mirrors apps/api/src/auth/dto/refresh.dto.ts. */
export type RefreshRequest = {
  refreshToken: string;
};

/** Mirrors apps/api/src/auth/dto/auth-response.dto.ts's `AuthResponseDto`. */
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};
