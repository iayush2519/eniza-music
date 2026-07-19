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

/** Mirrors apps/api/src/auth/dto/verify-otp.dto.ts. Used for both the
 * registration-verification and forgot-password-verification endpoints —
 * the request shape (email + 6-digit code) is identical; only the URL
 * (and therefore what happens server-side) differs. */
export type VerifyOtpRequest = {
  email: string;
  code: string;
};

/** Mirrors apps/api/src/auth/dto/resend-otp.dto.ts. */
export type ResendOtpRequest = {
  email: string;
};

/** Mirrors apps/api/src/auth/dto/forgot-password.dto.ts. */
export type ForgotPasswordRequest = {
  email: string;
};

/** Response of `POST /auth/forgot-password/verify` — the short-lived
 * token to present to `POST /auth/reset-password`. */
export type VerifyPasswordResetOtpResponse = {
  resetToken: string;
};

/** Mirrors apps/api/src/auth/dto/reset-password.dto.ts. */
export type ResetPasswordRequest = {
  resetToken: string;
  newPassword: string;
};
