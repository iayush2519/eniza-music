import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOtpRequest,
  ResetPasswordRequest,
  UserProfile,
  VerifyOtpRequest,
  VerifyPasswordResetOtpResponse,
} from '@music-app/shared-types';

import { HttpClient } from '../http-client';
import { AuthTokenStore } from '../token-store';

export class AuthClient {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenStore: AuthTokenStore,
  ) {}

  /**
   * Rehydrates the current user's profile from a stored access token —
   * used on app start when tokens already exist in SecureStore but no
   * in-memory user profile does yet. Throws `ApiError` (401) if there is
   * no valid session, which the caller treats as "not logged in."
   */
  me(): Promise<UserProfile> {
    return this.http.request('/users/me');
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const result = await this.http.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
    await this.persistTokens(result);
    return result;
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const result = await this.http.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
    await this.persistTokens(result);
    return result;
  }

  /**
   * Logs out on the server (revoking the current session) and clears
   * locally stored tokens regardless of whether the server call
   * succeeds — a failed logout request should never leave stale tokens
   * behind on the device.
   */
  async logout(): Promise<void> {
    const tokens = await this.tokenStore.getTokens();

    try {
      if (tokens) {
        await this.http.request<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken: tokens.refreshToken },
          skipAuth: true,
        });
      }
    } finally {
      await this.tokenStore.clearTokens();
    }
  }

  /** Verifies the OTP sent at registration, flipping the account's
   * `emailVerified` flag. Runs before a session exists in the sense that
   * it doesn't need one — the request is keyed by email, not a bearer
   * token — so, like register/login, it's sent with `skipAuth: true`. */
  verifyOtp(request: VerifyOtpRequest): Promise<UserProfile> {
    return this.http.request('/auth/verify-otp', { method: 'POST', body: request, skipAuth: true });
  }

  resendOtp(request: ResendOtpRequest): Promise<void> {
    return this.http.request('/auth/resend-otp', { method: 'POST', body: request, skipAuth: true });
  }

  forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    return this.http.request('/auth/forgot-password', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
  }

  verifyForgotPasswordOtp(request: VerifyOtpRequest): Promise<VerifyPasswordResetOtpResponse> {
    return this.http.request('/auth/forgot-password/verify', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
  }

  resetPassword(request: ResetPasswordRequest): Promise<void> {
    return this.http.request('/auth/reset-password', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
  }

  private async persistTokens(result: AuthResponse): Promise<void> {
    await this.tokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  }
}
