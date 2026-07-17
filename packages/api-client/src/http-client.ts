import { ApiError } from './errors';
import { AuthTokenStore } from './token-store';
import { AuthResponse, RefreshRequest } from '@music-app/shared-types';

export type HttpClientOptions = {
  /** e.g. "http://localhost:3000" in dev, the deployed API origin in prod. */
  baseUrl: string;
  tokenStore: AuthTokenStore;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Skip attaching the access token — used by the auth endpoints themselves. */
  skipAuth?: boolean;
};

/**
 * Thin `fetch` wrapper shared by every domain client (auth/catalog/
 * library). Owns exactly three cross-cutting concerns so individual
 * method groups don't each reimplement them:
 *
 * 1. Attaching `Authorization: Bearer <accessToken>` automatically.
 * 2. On a 401 from a request that *did* carry a token, transparently
 *    calling `/auth/refresh` once and retrying the original request —
 *    the caller never has to think about token expiry.
 * 3. Parsing JSON responses and throwing a typed `ApiError` for non-2xx
 *    responses, including Nest's validation-error body shape.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenStore: AuthTokenStore;
  private refreshInFlight: Promise<void> | null = null;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tokenStore = options.tokenStore;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.performRequest(path, options);

    if (response.status === 401 && !options.skipAuth) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retryResponse = await this.performRequest(path, options);
        return this.parseOrThrow<T>(retryResponse);
      }
    }

    return this.parseOrThrow<T>(response);
  }

  private async performRequest(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (!options.skipAuth) {
      const tokens = await this.tokenStore.getTokens();
      if (tokens) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }

    return fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  }

  /**
   * Ensures only one refresh request is ever in flight at a time — if
   * several requests 401 concurrently, they all await the same refresh
   * rather than each independently rotating the refresh token (which
   * would make all but one of them fail replay detection, per
   * docs/decisions/0005-auth-token-strategy.md).
   */
  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }

    try {
      await this.refreshInFlight;
      return true;
    } catch {
      return false;
    }
  }

  private async performRefresh(): Promise<void> {
    const tokens = await this.tokenStore.getTokens();
    if (!tokens) {
      throw new ApiError(401, 'No refresh token available', null);
    }

    const response = await this.performRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken } satisfies RefreshRequest,
      skipAuth: true,
    });

    const result = await this.parseOrThrow<AuthResponse>(response);
    await this.tokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  }

  private async parseOrThrow<T>(response: Response): Promise<T> {
    const isNoContent = response.status === 204;
    const body = isNoContent ? null : await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        await this.tokenStore.clearTokens();
      }
      const message = extractErrorMessage(body) ?? `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, body);
    }

    return body as T;
  }
}

/** Nest's default HTTP exception body shape is `{ message, error, statusCode }`,
 * where `message` may be a string or (for validation errors) a string array. */
function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return undefined;
  }
  const { message } = body as { message: unknown };
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ');
  }
  return undefined;
}
