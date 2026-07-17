# ADR 0004: Design system token structure and initial visual identity

**Status:** Accepted
**Date:** 2026-07-16

## Context

Phase 2 requires a design system foundation (tokens, theming, core
primitives) per `docs/roadmap.md`, with an explicit product goal that the
app must feel original and not a clone of existing streaming products
(`docs/architecture/overview.md`). This needed a concrete starting palette
and token structure, not just an abstract plan.

## Decision

1. **Color roles, not raw palettes, are what components consume.** Every
   component reads a semantic role (`text`, `surface`, `accent`, ...); the
   actual hex values for light/dark are the only thing that changes between
   schemes. This is what makes theming (today: light/dark; later: a
   dynamic artwork-derived accent) a data change, not a component change.
2. **Initial palette:** warm near-black/near-white neutrals with a warm
   amber accent (`#FF8A3D`), rather than pure black/white or a
   green/red/blue accent. This is a deliberate departure from the
   color identities already strongly associated with existing streaming
   products, in service of the "not a clone" requirement.
3. **Native system fonts, not a bundled custom typeface, for Phase 2.** A
   distinctive typeface is a real part of visual identity, but choosing one
   in the abstract, before any real screen exists to judge it against, risks
   a wrong, costly-to-unwind choice. Native system fonts (`system-ui` /
   `sans-serif`) are free (no bundle size cost), already feel "fast and
   native," and keep the typeface decision open until Phase 7 (motion &
   polish pass) when there's real content to evaluate it against.
4. **Motion tokens (`duration`, `easing`) are established now, even before
   most animated features exist**, because the one animated primitive built
   in this phase (`Button`'s press feedback) needed to draw from a shared
   scale rather than inventing its own numbers — and every future animated
   component should have that scale ready to use rather than reinventing
   it in Phase 7.

## Alternatives considered

- **Bundle a custom/licensed typeface now.** Rejected for Phase 2: premature
  without real screens to validate it against, and adds a dependency
  (font-loading, licensing) before it's earned its place.
- **Use a popular streaming-app-adjacent accent (green, red).** Rejected
  outright — directly conflicts with the "not a clone" requirement.
- **Skip motion tokens until Phase 7.** Rejected: the `Button` primitive
  already needed *some* duration/easing values in Phase 2; defining them
  as tokens now costs nothing extra and avoids a later "extract magic
  numbers into tokens" cleanup pass.

## Consequences

- Any future re-theme (including the planned dynamic artwork-derived accent
  in Phase 7) is a change to `tokens/colors.ts` and `theme/theme.ts`, not a
  hunt through component code.
- A future custom typeface decision is deferred but not blocked — swapping
  `fontFamily` in `tokens/typography.ts` is the entire surface area.
