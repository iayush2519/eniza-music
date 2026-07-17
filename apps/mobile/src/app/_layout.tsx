import { ThemeProvider as DesignSystemThemeProvider, useColorScheme } from '@music-app/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
  const scheme = useColorScheme();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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

            Before bootstrap finishes, both groups are guarded off; Expo
            Router falls back to the first available screen, which is
            `splash` below.
          */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isBootstrapped}>
              <Stack.Screen name="splash" />
            </Stack.Protected>

            <Stack.Protected guard={isBootstrapped && !isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={isBootstrapped && isAuthenticated}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
          </Stack>
        </NavigationThemeProvider>
      </DesignSystemThemeProvider>
    </QueryClientProvider>
  );
}
