import { ApiError } from '@music-app/api-client';
import type { UserProfile } from '@music-app/shared-types';

/**
 * A fake `apiClient.auth` — the store's own dependency boundary (see
 * `@/lib/api-client`), mocked the same way `playback-store.spec.ts` mocks
 * `@/lib/playback-engine` one layer down. Every method is a `jest.fn()`
 * so each test configures only the resolved/rejected value it needs,
 * without a real `HttpClient`/`fetch`/SecureStore in the loop.
 */
const fakeAuthClient = {
  me: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  verifyOtp: jest.fn(),
  resendOtp: jest.fn(),
  forgotPassword: jest.fn(),
  verifyForgotPasswordOtp: jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('@/lib/api-client', () => ({ apiClient: { auth: fakeAuthClient } }));

// Imported after the mock is registered, matching the ordering
// `playback-store.spec.ts` uses for the same reason: the module under
// test resolves its dependency at import time.
// eslint-disable-next-line import/first
import { useAuthStore } from './auth-store';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    isArtist: false,
    emailVerified: false,
    ...overrides,
  };
}

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isBootstrapped: false,
      isSubmitting: false,
      error: null,
      passwordResetToken: null,
    });
  });

  describe('bootstrap', () => {
    it('sets the user and isBootstrapped on a valid session', async () => {
      const profile = makeProfile({ emailVerified: true });
      fakeAuthClient.me.mockResolvedValue(profile);

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState()).toMatchObject({ user: profile, isBootstrapped: true });
    });

    it('sets user to null (not an error) when there is no valid session', async () => {
      fakeAuthClient.me.mockRejectedValue(new ApiError(401, 'Unauthorized', null));

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        isBootstrapped: true,
        error: null,
      });
    });
  });

  describe('login', () => {
    it('sets the user on success', async () => {
      const profile = makeProfile({ emailVerified: true });
      fakeAuthClient.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b', user: profile });

      await useAuthStore.getState().login({ email: profile.email, password: 'Str0ngPass1' });

      expect(useAuthStore.getState()).toMatchObject({ user: profile, isSubmitting: false });
    });

    it('sets a readable error message and rethrows on failure', async () => {
      fakeAuthClient.login.mockRejectedValue(new ApiError(401, 'Invalid credentials', null));

      await expect(
        useAuthStore.getState().login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        isSubmitting: false,
        error: 'Invalid credentials',
      });
    });

    it('falls back to a generic message for a non-ApiError failure', async () => {
      fakeAuthClient.login.mockRejectedValue(new Error('network down'));

      await expect(
        useAuthStore.getState().login({ email: 'user@example.com', password: 'x' }),
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe('Something went wrong. Please try again.');
    });
  });

  describe('register', () => {
    it('sets the user (unverified) on success', async () => {
      const profile = makeProfile({ emailVerified: false });
      fakeAuthClient.register.mockResolvedValue({ accessToken: 'a', refreshToken: 'b', user: profile });

      await useAuthStore
        .getState()
        .register({ email: profile.email, password: 'Str0ngPass1', displayName: 'Test User' });

      expect(useAuthStore.getState()).toMatchObject({ user: profile, isSubmitting: false });
    });

    it('sets an error and rethrows on a duplicate-email failure', async () => {
      fakeAuthClient.register.mockRejectedValue(new ApiError(409, 'Email already registered', null));

      await expect(
        useAuthStore
          .getState()
          .register({ email: 'taken@example.com', password: 'Str0ngPass1', displayName: 'Test' }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(useAuthStore.getState().error).toBe('Email already registered');
    });
  });

  describe('logout', () => {
    it('clears the user regardless of the server response', async () => {
      useAuthStore.setState({ user: makeProfile() });
      fakeAuthClient.logout.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('verifyOtp', () => {
    it('replaces the user with the verified profile returned by the endpoint', async () => {
      const verifiedProfile = makeProfile({ emailVerified: true });
      fakeAuthClient.verifyOtp.mockResolvedValue(verifiedProfile);

      await useAuthStore.getState().verifyOtp({ email: verifiedProfile.email, code: '123456' });

      expect(useAuthStore.getState()).toMatchObject({ user: verifiedProfile, isSubmitting: false });
    });

    it('sets an error and rethrows on an invalid code', async () => {
      fakeAuthClient.verifyOtp.mockRejectedValue(new ApiError(400, 'Invalid or expired code', null));

      await expect(
        useAuthStore.getState().verifyOtp({ email: 'user@example.com', code: '000000' }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(useAuthStore.getState().error).toBe('Invalid or expired code');
    });
  });

  describe('resendOtp', () => {
    it('clears any existing error on success without touching isSubmitting', async () => {
      useAuthStore.setState({ error: 'stale error' });
      fakeAuthClient.resendOtp.mockResolvedValue(undefined);

      await useAuthStore.getState().resendOtp({ email: 'user@example.com' });

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('surfaces a cooldown error and rethrows', async () => {
      fakeAuthClient.resendOtp.mockRejectedValue(
        new ApiError(429, 'Please wait before requesting another code', null),
      );

      await expect(
        useAuthStore.getState().resendOtp({ email: 'user@example.com' }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(useAuthStore.getState().error).toBe('Please wait before requesting another code');
    });
  });

  describe('forgotPassword', () => {
    it('resolves without setting an error, regardless of whether the account exists', async () => {
      fakeAuthClient.forgotPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().forgotPassword({ email: 'anyone@example.com' });

      expect(useAuthStore.getState()).toMatchObject({ isSubmitting: false, error: null });
    });
  });

  describe('verifyPasswordResetOtp', () => {
    it('stores the returned reset token on success', async () => {
      fakeAuthClient.verifyForgotPasswordOtp.mockResolvedValue({ resetToken: 'reset-token-abc' });

      await useAuthStore
        .getState()
        .verifyPasswordResetOtp({ email: 'user@example.com', code: '123456' });

      expect(useAuthStore.getState().passwordResetToken).toBe('reset-token-abc');
    });

    it('does not store a token and rethrows on an invalid code', async () => {
      fakeAuthClient.verifyForgotPasswordOtp.mockRejectedValue(
        new ApiError(400, 'Invalid or expired code', null),
      );

      await expect(
        useAuthStore.getState().verifyPasswordResetOtp({ email: 'user@example.com', code: '000000' }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(useAuthStore.getState().passwordResetToken).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('throws immediately (without calling the API) when no reset token is held', async () => {
      await expect(useAuthStore.getState().resetPassword('NewStr0ngPass1')).rejects.toThrow(
        'Your verification has expired. Please start over.',
      );

      expect(fakeAuthClient.resetPassword).not.toHaveBeenCalled();
    });

    it('calls the API with the held token and clears it on success', async () => {
      useAuthStore.setState({ passwordResetToken: 'reset-token-abc' });
      fakeAuthClient.resetPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().resetPassword('NewStr0ngPass1');

      expect(fakeAuthClient.resetPassword).toHaveBeenCalledWith({
        resetToken: 'reset-token-abc',
        newPassword: 'NewStr0ngPass1',
      });
      expect(useAuthStore.getState().passwordResetToken).toBeNull();
    });

    it('keeps the token and sets an error if the API call fails', async () => {
      useAuthStore.setState({ passwordResetToken: 'reset-token-abc' });
      fakeAuthClient.resetPassword.mockRejectedValue(new ApiError(401, 'Token expired', null));

      await expect(useAuthStore.getState().resetPassword('NewStr0ngPass1')).rejects.toBeInstanceOf(
        ApiError,
      );

      expect(useAuthStore.getState()).toMatchObject({
        passwordResetToken: 'reset-token-abc',
        error: 'Token expired',
      });
    });
  });

  describe('resetPasswordFlow', () => {
    it('clears the reset token and any error', () => {
      useAuthStore.setState({ passwordResetToken: 'stale-token', error: 'stale error' });

      useAuthStore.getState().resetPasswordFlow();

      expect(useAuthStore.getState()).toMatchObject({ passwordResetToken: null, error: null });
    });
  });
});
