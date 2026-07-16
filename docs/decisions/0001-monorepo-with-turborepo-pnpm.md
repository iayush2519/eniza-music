# ADR 0001: Monorepo with pnpm workspaces + Turborepo

**Status:** Accepted
**Date:** 2026-07-16

## Context

The project has at least two deployable units (mobile app, backend API) and
several pieces of logic/design that need to be shared between them (API
contracts, design tokens, potentially a native audio module abstraction).
Future platforms (iOS, tablet, desktop, web) will reuse large parts of the
mobile codebase and design system.

## Decision

Use a single monorepo managed with pnpm workspaces for dependency
management and Turborepo for task orchestration/caching, structured as
`apps/*` (deployable) and `packages/*` (internal libraries).

## Alternatives considered

- **Separate repos for mobile and backend.** Rejected: makes sharing typed
  API contracts painful (would require publishing a versioned package to a
  registry or git submodules), and adds friction for a small team/solo
  build where cross-cutting changes are common.
- **Nx instead of Turborepo.** Both are reasonable. Turborepo was chosen for
  its simpler configuration surface and first-class fit with the
  Vercel/Next-adjacent JS ecosystem tooling we're already using elsewhere
  (pnpm, TypeScript). Nx's stronger plugin ecosystem is not needed here.
- **Yarn/npm workspaces instead of pnpm.** pnpm chosen for stricter
  dependency resolution (no phantom dependencies) and disk efficiency via
  content-addressable storage.

## Consequences

- All internal packages are unpublished, versioned `0.0.0`, referenced via
  `workspace:*`.
- CI must be workspace-aware (run affected-package tasks via Turborepo
  rather than per-directory scripts).
- Any future platform target (web, desktop) becomes a new `apps/*` entry
  reusing existing `packages/*`, not a new repo.
