# Product Overview

## What this is

An original, premium music streaming application, Android-first, built with
React Native/Expo and a NestJS backend. It is **not** a clone of any existing
streaming product — those products are studied only for general usability
principles, never copied for layout, navigation, branding, or workflow.

## Product model

The platform is an **independent-artist upload platform**: artists upload
their own tracks, listeners stream them. This was chosen over a licensed
commercial catalog because:

- It requires no real-world licensing deal to build and demo.
- It is legally clean for a portfolio project.
- It showcases full-stack depth: upload pipeline, transcoding, catalog
  management, streaming, offline downloads — not just a UI over someone
  else's API.

The system is explicitly designed so a **licensed catalog provider** could be
added later as a second content source without a rewrite. See
[`content-model.md`](./content-model.md) for how that extensibility is
achieved, and
[`decisions/0003-content-model-upload-platform.md`](../decisions/0003-content-model-upload-platform.md)
for the reasoning.

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
- Real DRM or licensed commercial catalog integration.
- iOS/tablet/desktop/web builds (the architecture supports them later, but
  we build and verify Android first).

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
