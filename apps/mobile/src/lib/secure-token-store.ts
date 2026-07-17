import type { AuthTokenStore, TokenPair } from '@music-app/api-client';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

/**
 * `AuthTokenStore` backed by `expo-secure-store` — the Keychain (iOS) /
 * Keystore (Android) encrypted storage. Per
 * docs/architecture/state-management.md: "Never persist secrets outside
 * SecureStore. MMKV is fast but not encrypted at rest by default in a way
 * we should trust for tokens." Access and refresh tokens are stored as
 * two separate keys (not one JSON blob) purely so either can be read
 * independently without parsing, matching SecureStore's per-key API.
 */
export function createSecureTokenStore(): AuthTokenStore {
  return {
    async getTokens(): Promise<TokenPair | null> {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      if (!accessToken || !refreshToken) {
        return null;
      }

      return { accessToken, refreshToken };
    },

    async setTokens(tokens: TokenPair): Promise<void> {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      ]);
    },

    async clearTokens(): Promise<void> {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    },
  };
}
