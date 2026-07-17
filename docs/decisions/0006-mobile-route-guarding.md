# ADR 0006: Mobile route guarding via Expo Router's `Stack.Protected`

**Status:** Accepted
**Date:** 2026-07-18

## Context

Phase 4 introduced the first authenticated screens (Library) alongside the
first unauthenticated ones (Home, Explore) and a real login/register flow.
The root layout needed a way to show `splash` while the initial session
check (`useAuthStore.bootstrap()`) runs, then route to `(auth)` or `(tabs)`
depending on whether that check found a valid session.

## Decision

Use Expo Router's `Stack.Protected guard={...}` component to gate each top
level route group (`splash`, `(auth)`, `(tabs)`) behind a boolean
expression derived from `useAuthStore`, rather than a hand-rolled
`useSegments()` + `<Redirect>` check in a `useEffect`.

```tsx
<Stack.Protected guard={!isBootstrapped}>
  <Stack.Screen name="splash" />
</Stack.Protected>
<Stack.Protected guard={isBootstrapped && !isAuthenticated}>
  <Stack.Screen name="(auth)" />
</Stack.Protected>
<Stack.Protected guard={isBootstrapped && isAuthenticated}>
  <Stack.Screen name="(tabs)" />
</Stack.Protected>
```

## Alternatives considered

**Hand-rolled guard: `useSegments()` + `<Redirect>` in a `useEffect`.**
This was actually built first, then deleted. It requires manually:
reading the current route segments, comparing them against the auth
state to decide if a redirect is needed, issuing the redirect, and
separately making sure the navigation history doesn't leave a
now-inaccessible screen reachable via the back button. `Stack.Protected`
is Expo Router's current, documented API for precisely this scenario
(verified against docs.expo.dev/router/advanced/protected — this is the
actively recommended approach, not a deprecated or experimental one) and
absorbs all of that bookkeeping. Once both versions existed side by side,
the hand-rolled one was strictly more code providing the same behavior,
so it was removed rather than kept as a fallback.

## Consequences

- Adding a fourth gated state in the future (e.g. an onboarding flow
  between `(auth)` and `(tabs)`) is another `Stack.Protected` block with
  its own guard expression, not a change to shared redirect logic.
- This ties the app's top-level navigation structure to Expo Router's
  `Stack.Protected` API remaining supported. Given it's the
  currently-documented, first-party mechanism for this exact use case
  (not a community workaround), this is an accepted dependency, same as
  relying on any other first-party Expo Router API.
