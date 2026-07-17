import { AuthResponse, LoginRequest, RegisterRequest } from '@music-app/shared-types';

import { HttpClient } from '../http-client';
import { AuthTokenStore } from '../token-store';

export class AuthClient {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenStore: AuthTokenStore,
  ) {}

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

  private async persistTokens(result: AuthResponse): Promise<void> {
    await this.tokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  }
}
