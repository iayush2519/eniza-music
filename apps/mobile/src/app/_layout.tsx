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
  const isEmailVerified = useAuthStore((state) => state.user?.emailVerified ?? false);

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
                `!isEmailVerified` — see the real bug this previously
                caused, fixed by moving verify-otp/auth-result out of
                this group entirely rather than trying to patch the
                guard (see those screens' own top-level `<Stack.Screen>`
                entries below for the full explanation): keeping them
                inside `(auth)` meant *any* condition that widens this
                guard to stay true past the moment `isAuthenticated`
                flips true would race the "Account Verified" screen the
                same way the original bug did, just moved to a
                different transition. Two screens that must be reachable
                in *both* the pre-auth and authenticated-but-unverified
                states can't cleanly belong to a group whose only job is
                gating pre-auth screens — they belong at the root
                instead, same as `player`/`lyrics` below.
              */}
              <Stack.Protected guard={isReady && !isAuthenticated && hasSeenOnboarding}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>

              {/*
                `(tabs)` is deliberately declared *before* verify-otp/
                auth-result below, even though all three can be
                simultaneously "eligible" (guard-true) for an
                authenticated-but-unverified user. This ordering is the
                actual fix for a confirmed bug where a fully verified,
                authenticated user intermittently landed on verify-otp
                (and, in the equivalent auth-result case, on "Account
                Verified") immediately after a successful login, with no
                `email`/`purpose` params ever having been pushed.

                The root cause: when `(auth)` unmounts the instant
                `isAuthenticated` flips true, `Stack.Protected` doesn't
                just hide the unmounted screen, it has to pick some
                eligible screen to focus next — and it does so by
                declaration order among every currently-eligible
                `Stack.Screen`, not by "which one makes semantic sense
                for this transition." With verify-otp/auth-result
                declared *before* `(tabs)` and both guarded by
                unconditionally-or-broadly-true conditions, they kept
                winning that fallback regardless of whether the user was
                actually unverified.

                Declaring `(tabs)` first means a *verified* user's
                fallback always lands on `(tabs)` (verify-otp/auth-result
                aren't guard-eligible for them: see verify-otp's own
                `!isEmailVerified` guard below; auth-result is only ever
                reached by explicit push, never by this fallback, once
                `(tabs)` outranks it here). An *unverified* user's
                fallback still lands on `(tabs)` first too — but
                `(tabs)/_layout.tsx` renders `null` and its own redirect
                effect immediately replaces the route with verify-otp,
                which is a real, explicit navigation (carrying real
                `email`/`purpose` params) rather than another fallback
                guess. That effect, not this declaration order, is the
                single source of truth for "should this user see
                verify-otp" — the order here only decides who wins ties
                on the same tick `(auth)` unmounts, and `(tabs)` winning
                those ties is always correct because it re-delegates
                immediately when it isn't.
              */}
              <Stack.Protected guard={isReady && isAuthenticated}>
                <Stack.Screen name="(tabs)" />
                {/*
                  Player/Lyrics/detail screens are registered as
                  top-level routes (siblings of `(tabs)`, not nested
                  inside it) — per
                  docs/design/design-system-specification.md's
                  Navigation Flow ("Mini Player -> (Expand animation) ->
                  Full Player"), the Full Player must be reachable from
                  the Mini Player regardless of which tab is currently
                  active, and a modal presentation reads correctly
                  ("pushed over" whatever tab screen was showing) only
                  when it isn't nested inside one specific tab's own
                  stack.
                */}
                <Stack.Screen name="player" options={{ presentation: 'modal' }} />
                <Stack.Screen name="lyrics" options={{ presentation: 'modal' }} />
                <Stack.Screen name="album/[id]" />
                <Stack.Screen name="artist/[id]" />
                <Stack.Screen name="playlist/[id]" />
              </Stack.Protected>

              {/*
                verify-otp is reachable from two disjoint auth states —
                pre-auth (fresh register/forgot-password, where `user` is
                null so `isEmailVerified` is false) and
                authenticated-but-unverified — so, like player/lyrics/
                detail above, it's a top-level route rather than nested
                in a group gated on `isAuthenticated` either way. Gated
                on `!isEmailVerified` (not unconditionally `isReady`) so
                it's never eligible for an already-verified user at all,
                on top of losing every fallback tie to `(tabs)` per the
                comment above.
              */}
              <Stack.Protected guard={isReady && !isEmailVerified}>
                <Stack.Screen name="verify-otp" />
              </Stack.Protected>

              {/*
                auth-result is gated on `isReady` alone (not
                `!isEmailVerified`, unlike verify-otp) because it's the
                one screen that must stay mounted through the exact
                instant `isEmailVerified` flips true — `verifyOtp()`
                succeeding is what navigates here in the first place, so
                tying its guard to that same flag would unmount it out
                from under itself mid-view. This is now safe from the
                same focus-stealing bug verify-otp had purely because of
                declaration order: it's declared *after* `(tabs)` above,
                so it can never win a fallback tie against `(tabs)` for
                an authenticated user — it's only ever reached by an
                explicit push/replace (from verify-otp or
                reset-password), never by `Stack.Protected` falling back
                into it.
              */}
              <Stack.Protected guard={isReady}>
                <Stack.Screen name="auth-result" />
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
