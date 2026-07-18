import { ThemeProvider as DesignSystemThemeProvider, useColorScheme } from '@music-app/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

export default function RootLayout() {
  const scheme = useColorScheme();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  const loadOnboarding = useOnboardingStore((state) => state.load);
  const isOnboardingLoaded = useOnboardingStore((state) => state.isLoaded);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);

  useEffect(() => {
    void bootstrap();
    void loadOnboarding();
  }, [bootstrap, loadOnboarding]);

  const isReady = isBootstrapped && isOnboardingLoaded;

  return (
    <QueryClientProvider client={queryClient}>
      <DesignSystemThemeProvider>
        <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/*
            Per docs.expo.dev/router/advanced/protected: `Stack.Protected`
            is the current, officially recommended way to gate whole route
            groups behind a runtime condition — it handles redirect-on-
            guard-change and navigation-history cleanup automatically,
            which a hand-rolled `useSegments` + `<Redirect>` check would
            otherwise have to reimplement.

            Before both the session check and the onboarding-seen check
            finish, every group is guarded off; Expo Router falls back to
            the first available screen, which is `splash` below. Once
            ready, a logged-out user who hasn't seen onboarding gets it
            exactly once — completing it (or skipping it) flips
            `hasSeenOnboarding` and this guard naturally falls through to
            (auth), with no separate navigation call needed here.
          */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isReady}>
              <Stack.Screen name="splash" />
            </Stack.Protected>

            <Stack.Protected guard={isReady && !isAuthenticated && !hasSeenOnboarding}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>

            <Stack.Protected guard={isReady && !isAuthenticated && hasSeenOnboarding}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={isReady && isAuthenticated}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
          </Stack>
        </NavigationThemeProvider>
      </DesignSystemThemeProvider>
    </QueryClientProvider>
  );
}
