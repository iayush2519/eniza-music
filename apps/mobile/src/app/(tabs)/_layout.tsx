import { router } from 'expo-router';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Enforces "an authenticated-but-unverified account cannot reach the
 * main app" — the other half of the protected-routes requirement not
 * covered by the root layout's `Stack.Protected` guards (see
 * apps/mobile/src/app/_layout.tsx's comment on the `(auth)` guard for
 * why this couldn't live there without racing the verification success
 * screen). Runs as a redirect effect rather than a `Stack.Protected`
 * guard for the same reason: (tabs) itself has no verification-outcome
 * screen to protect against redirecting away from mid-transition, so
 * there's no race to avoid here — an unverified user should never see
 * any tab content, not even for one frame.
 */
export default function TabsLayout() {
  const email = useAuthStore((state) => state.user?.email);
  const isEmailVerified = useAuthStore((state) => state.user?.emailVerified ?? false);

  useEffect(() => {
    if (!isEmailVerified && email) {
      router.replace({ pathname: '/(auth)/verify-otp', params: { email, purpose: 'register' } });
    }
  }, [isEmailVerified, email]);

  if (!isEmailVerified) {
    return null;
  }

  return <AppTabs />;
}
