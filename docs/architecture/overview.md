# Product Overview

## What this is

An original, premium music streaming application, Android-first, built with
React Native/Expo and a NestJS backend. It is **not** a clone of any existing
streaming product — those products are studied only for general usability
principles, never copied for layout, navigation, branding, or workflow.

## Product model

> **Updated 2026-07-19.** The product was originally an independent-artist
> upload platform (see history below). It is now a **provider-backed
> streaming client**: the backend never hosts audio or lets users publish
> tracks. Music discovery and playback are delegated to an external
> `MusicProvider` behind a `MusicGateway` abstraction, with the backend
> owning everything user-specific — auth, users, playlists, library,
> favorites, listening/search history, recommendations, settings,
> analytics, and a local metadata cache of provider responses. See
> [`decisions/0007-provider-backed-music-catalog.md`](../decisions/0007-provider-backed-music-catalog.md)
> and [`music-provider-architecture.md`](./music-provider-architecture.md)
> for the current design.
>
> The primary user flow is: **Open App → (personalized) Home ⇄ Search →
> Results → Tap Track → Immediate Playback.** Home remains the
> personalized landing page (recommendations, recently played, your
> playlists); Search is a permanent, first-class way to find something
> specific — neither replaces the other.

### History: why this changed

The platform started as an **independent-artist upload platform**: artists
upload their own tracks, listeners stream them. That was chosen over a
licensed commercial catalog because it required no real-world licensing
deal, was legally clean for a portfolio project, and showcased full-stack
upload/transcoding depth. See
[`decisions/0003-content-model-upload-platform.md`](../decisions/0003-content-model-upload-platform.md)
for that original reasoning, and ADR 0007 for why the product direction
changed to a premium streaming client (in the spirit of Apple Music/
Spotify, with its own original identity) rather than an upload platform —
this requires real third-party catalog breadth that no self-upload model
can provide, so discovery/playback moved to a provider abstraction while
the upload pipeline itself was retired.

## Design goals

The app must feel: premium, modern, elegant, minimal, intelligent, fast,
beautiful, original, portfolio-quality.

Concretely, this means:

- A design system with tokens (spacing, radii, typography, motion curves,
  color roles), not per-screen ad-hoc styling.
- Motion and gesture as a first-class part of the UI, not decoration bolted
  on afterward (Reanimated + Gesture Handler throughout).
- A visual identity that is *ours* — e.g. accent color derived dynamically
  from now-playing artwork, not a fixed brand-green-on-black theme.
- Performance budgets taken seriously: cold start time, list scroll
  performance, and audio-transition latency are treated as product
  requirements, not afterthoughts.

## Explicit non-goals (for the initial release)

These are deliberately out of scope until asked for, to keep the project
shippable in phases:

- Enterprise-scale infrastructure (multi-region, autoscaling groups).
- Payment processing / monetization.
- Real DRM.
- iOS/tablet/desktop/web builds (the architecture supports them later, but
  we build and verify Android first).

Note: "licensed commercial catalog integration" moved from a non-goal to
the actual model — see the Product model section above.

## Target platforms

- **Primary:** Android (phone).
- **Future:** iOS, tablet, desktop, web. The architecture (Expo, shared
  design system package, platform-abstracted audio engine) is chosen so
  these can be added without re-architecting, but no code for them is
  written until requested.

## Quality bar

This is a portfolio-quality build, which in this project means: production
patterns (proper auth, proper caching, proper CI, proper error handling)
without production-scale infrastructure. Every phase ends with something
that actually builds and runs before the next phase starts.
