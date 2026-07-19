import { ThemeProvider as DesignSystemThemeProvider } from '@music-app/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useReportPlaybackProgress } from '@/hooks/use-report-playback-progress';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  // Mounted once, app-wide — playback (and therefore "Continue
  // Listening" progress reporting) continues across screens/tabs, not
  // scoped to any one of them. See the hook's own doc comment for why
  // this can't live inside Home instead.
  useReportPlaybackProgress();

  const loadOnboarding = useOnboardingStore((state) => state.load);
  const isOnboardingLoaded = useOnboardingStore((state) => state.isLoaded);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);

  useEffect(() => {
    void bootstrap();
    void loadOnboarding();
  }, [bootstrap, loadOnboarding]);

  const isReady = isBootstrapped && isOnboardingLoaded;

  return (
    // Gesture foundation: `GestureHandlerRootView` must wrap as close to
    // the true root as possible (per react-native-gesture-handler's own
    // installation docs) so every gesture-driven component added later —
    // a draggable Full Player/Mini Player handoff, a real drag-to-seek
    // `ProgressSeekBar`/`Slider`, a draggable `ContextMenu`/bottom sheet,
    // swipe-to-dismiss — has one consistent gesture root to mount under
    // for the lifetime of the app, rather than each feature having to
    // remember to add its own. This is foundational plumbing only: no
    // gesture is attached to any component in this pass, and no visual
    // change results from this wrapper (it renders a plain, unstyled
    // `View` by default; `flex: 1` below matches the app's existing
    // full-bleed root sizing).
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <DesignSystemThemeProvider>
          {/*
            ENIZA Version 1.0 is light-only (see
            `@music-app/design-system`'s `ThemeProvider` for the full
            rationale) — Expo Router's own navigation chrome (native
            header/background colors during screen transitions) must
            match, so this is pinned to `DefaultTheme` rather than
            following the OS scheme, the same way the design-system's
            `ThemeProvider` no longer reads `useColorScheme()`.
          */}
          <NavigationThemeProvider value={DefaultTheme}>
            {/*
              Per docs.expo.dev/router/advanced/protected: `Stack.Protected`
              is the current, officially recommended way to gate whole
              route groups behind a runtime condition — it handles
              redirect-on-guard-change and navigation-history cleanup
              automatically, which a hand-rolled `useSegments` +
              `<Redirect>` check would otherwise have to reimplement.

              Before both the session check and the onboarding-seen check
              finish, every group is guarded off; Expo Router falls back
              to the first available screen, which is `splash` below.
              Once ready, a logged-out user who hasn't seen onboarding
              gets it exactly once — completing it (or skipping it) flips
              `hasSeenOnboarding` and this guard naturally falls through
              to (auth), with no separate navigation call needed here.
            */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!isReady}>
                <Stack.Screen name="splash" />
              </Stack.Protected>

              <Stack.Protected guard={isReady && !isAuthenticated && !hasSeenOnboarding}>
                <Stack.Screen name="onboarding" />
              </Stack.Protected>

              {/*
                Deliberately gated on `isAuthenticated` alone, not also
                `!isEmailVerified` — an earlier version of this guard also
                required `isAuthenticated && !isEmailVerified` to keep
                (auth) reachable through the verify-otp/auth-result
                screens post-registration. That created a real race: the
                instant `verifyOtp` succeeds, `isEmailVerified` flips
                true, which would make *this* guard false and (tabs)'s
                guard true before the "Account Verified" screen could
                even render — Stack.Protected forcibly redirects away
                from any screen in a group whose guard just went false,
                which would skip the confirmation screen the approved UI
                board shows entirely.

                Verification enforcement instead lives in (tabs)'s own
                layout (see (tabs)/_layout.tsx) as an explicit redirect
                effect, plus the two places that ever transition
                `isAuthenticated` from false to true — register.tsx and
                login.tsx — both explicitly push to verify-otp when the
                resulting profile isn't yet verified. Together these
                cover the same "an authenticated-but-unverified user
                cannot reach the main app" requirement without a
                structural guard racing against in-flow navigation.
              */}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
