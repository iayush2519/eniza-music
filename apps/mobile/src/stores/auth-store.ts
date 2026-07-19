import { ApiError } from '@music-app/api-client';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOtpRequest,
  ResetPasswordRequest,
  UserProfile,
  VerifyOtpRequest,
} from '@music-app/shared-types';
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
 *
 * `passwordResetToken`/`pendingResetEmail` are the one exception to
 * "no auth flow state lives here beyond the user profile" — they're the
 * minimum handoff needed between the three-screen forgot-password flow
 * (ForgotPassword -> VerifyOtp -> ResetPassword), and are cleared the
 * moment the flow completes or is abandoned (see `resetPasswordFlow`).
 */
type AuthState = {
  user: UserProfile | null;
  /** True once the initial "is there already a session?" check has
   * completed (success or failure) — lets the UI show a splash/loading
   * state instead of flashing a login screen before that check runs. */
  isBootstrapped: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** Set once `verifyPasswordResetOtp` succeeds; presented to
   * `resetPassword`. Cleared on success or when the flow is abandoned. */
  passwordResetToken: string | null;

  bootstrap: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  verifyOtp: (request: VerifyOtpRequest) => Promise<void>;
  resendOtp: (request: ResendOtpRequest) => Promise<void>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<void>;
  verifyPasswordResetOtp: (request: VerifyOtpRequest) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  /** Clears in-flight forgot-password state (the reset token and any
   * error) — called when the user backs out of the flow before
   * completing it, so a stale token from an abandoned attempt can never
   * be reused by a later one. */
  resetPasswordFlow: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isBootstrapped: false,
  isSubmitting: false,
  error: null,
  passwordResetToken: null,

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

  /**
   * On success, updates the in-memory `user.emailVerified` flag directly
   * from the response rather than re-fetching via `bootstrap()` — the
   * verify-otp endpoint already returns the full updated profile (see
   * AuthController.verifyOtp), so a second round-trip would be
   * redundant.
   */
  verifyOtp: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      const user = await apiClient.auth.verifyOtp(request);
      set({ user, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  resendOtp: async (request) => {
    set({ error: null });
    try {
      await apiClient.auth.resendOtp(request);
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  forgotPassword: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiClient.auth.forgotPassword(request);
      set({ isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  verifyPasswordResetOtp: async (request) => {
    set({ isSubmitting: true, error: null });
    try {
      const { resetToken } = await apiClient.auth.verifyForgotPasswordOtp(request);
      set({ isSubmitting: false, passwordResetToken: resetToken });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  resetPassword: async (newPassword) => {
    const resetToken = get().passwordResetToken;
    if (!resetToken) {
      // Reaching ResetPassword without a token means the flow's own
      // navigation guard was bypassed (deep link, back/forward glitch) —
      // fail loudly rather than calling the API with an empty token.
      const message = 'Your verification has expired. Please start over.';
      set({ error: message });
      throw new Error(message);
    }

    set({ isSubmitting: true, error: null });
    try {
      const request: ResetPasswordRequest = { resetToken, newPassword };
      await apiClient.auth.resetPassword(request);
      set({ isSubmitting: false, passwordResetToken: null });
    } catch (error) {
      set({ isSubmitting: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  resetPasswordFlow: () => {
    set({ passwordResetToken: null, error: null });
  },
}));

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
