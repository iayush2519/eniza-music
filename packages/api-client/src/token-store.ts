export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Storage-agnostic token persistence. `apps/mobile` provides the real
 * implementation (backed by `expo-secure-store`, per
 * docs/architecture/state-management.md: "Never persist secrets outside
 * SecureStore") — this package never imports a storage library directly,
 * so it stays usable from any future client (web, desktop) with its own
 * appropriate secure-storage mechanism.
 */
export type AuthTokenStore = {
  getTokens: () => Promise<TokenPair | null>;
  setTokens: (tokens: TokenPair) => Promise<void>;
  clearTokens: () => Promise<void>;
};

/**
 * A trivial in-memory token store. Not for production use in the mobile
 * app (tokens must survive app restarts, hence SecureStore there), but
 * useful as the default so `ApiClient` is constructible and testable
 * without requiring every caller to supply a real store up front.
 */
export function createInMemoryTokenStore(): AuthTokenStore {
  let tokens: TokenPair | null = null;

  return {
    getTokens: async () => tokens,
    setTokens: async (newTokens) => {
      tokens = newTokens;
    },
    clearTokens: async () => {
      tokens = null;
    },
  };
}
