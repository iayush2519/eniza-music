import { ApiError } from '@music-app/api-client';
import type { LoginRequest, RegisterRequest, UserProfile } from '@music-app/shared-types';
import { create } from 'zustand';

import { apiClient } from '@/lib/api-client';

/**
 * Ephemeral, in-memory auth state (the current user profile + whether
 * we've finished checking for an existing session). Deliberately NOT
 * persisted via a Zustand middleware — per
 * docs/architecture/state-management.md, the actual secret (tokens) lives
 * in SecureStore via `apiClient`'s token store, and the user profile
 * itself is server state that gets re-fetched on `bootstrap()`, not
 * something this store needs to survive a restart on its own.
 */
type AuthState = {
  user: UserProfile | null;
  /** True once the initial "is there already a session?" check has
   * completed (success or failure) — lets the UI show a splash/loading
   * state instead of flashing a login screen before that check runs. */
  isBootstrapped: boolean;
  isSubmitting: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isBootstrapped: false,
  isSubmitting: false,
  error: null,

  bootstrap: async () => {
    try {
      const user = await apiClient.auth.me();
      set({ user, isBootstrapped: true });
    } catch {
      // No valid session (no stored tokens, or they're expired/revoked
      // and refresh also failed) — this is an expected outcome for a
      // logged-out user, not an error worth surfacing.
      set({ user: null, isBootstrapped: true });
    }
  },

  login: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await apiClient.auth.login(request);
      set({ user: result.user, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  register: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await apiClient.auth.register(request);
      set({ user: result.user, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    await apiClient.auth.logout();
    set({ user: null });
  },
}));

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
