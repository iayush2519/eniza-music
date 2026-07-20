# Documentation Index

This folder is the source of truth for architectural decisions on this project.
Future implementation sessions (human or AI) should read these documents
before making structural changes, instead of relying on chat history.

## Structure

- `architecture/` — descriptive documents explaining how each part of the
  system is built and why. Update these when the *shape* of the system
  changes. `system-overview.md` is the entry point; it links out to the
  rest.
- `decisions/` — Architecture Decision Records (ADRs). Immutable once
  accepted; if a decision changes later, write a new ADR that supersedes the
  old one rather than editing it in place.
- `testing/` — testing strategy, current test coverage, and the plan for
  testing features not yet built.
- `deployment/` — platform-specific build/deployment status (Android, iOS,
  CI/CD). States plainly what exists and what doesn't — these documents do
  not describe aspirational pipelines as if they were built.
- `branding/` — the Branding Assets v1.0 inventory and freeze rule.
- `design/` — the frozen Design System specification and component
  inventory.
- `roadmap.md` — phase-by-phase delivery plan and current status. **The
  single authoritative source for "what phase are we in and what's
  actually been built."**

## Project Standards (permanent, apply to every phase)

These rules do not expire and do not get re-litigated per phase. They were
formalized in Phase 6.1 (see
[ADR 0009](decisions/ADR-0009-phase6-roadmap.md)) but several were already
in effect as unwritten practice before that — writing them down here makes
them enforceable rather than assumed.

1. **The approved UI is frozen.** Screen layouts, navigation structure,
   and visual hierarchy as built through Phase 5.6 are not to be
   redesigned. Extending a screen with new, additive functionality is
   permitted; changing how existing elements look or are arranged is not,
   without an explicit approval captured in an ADR.
2. **Branding Assets v1.0 are frozen.** See
   [`branding/branding-v1.md`](branding/branding-v1.md)'s freeze rule.
   No file under `assets/app-icon/`, `assets/branding/`, `assets/favicon/`,
   or `assets/splash/` is redesigned, recolored, resized, or replaced
   without a new ADR.
3. **The Design System is the single source of visual truth.** Per
   `architecture/design-system.md`: no screen or feature package defines
   its own color literal, spacing number, or font size. Everything routes
   through `packages/design-system`'s tokens, theme, or primitives.
4. **Architecture is preserved unless documented with an ADR.** The
   monorepo shape, the modular-monolith backend, the provider-backed
   catalog pattern, and the `PlaybackEngine` platform-abstraction contract
   are not to be changed opportunistically mid-feature. If a change to any
   of these is genuinely needed, it is proposed and recorded as a new ADR
   *before* implementation, following the existing pattern in
   `decisions/0001`–`0009`.
5. **Every milestone requires, before it is considered complete:**
   - TypeScript verification (`typecheck` for every affected
     app/package).
   - ESLint verification (`lint` for every affected app/package).
   - Jest verification (`test` for every affected app/package, plus
     `test:e2e` for backend changes).
   - Android verification, when the change touches native code,
     `app.json`, or branding assets (`gradlew assembleDebug` at minimum;
     see `deployment/android.md`).
   - A documentation update — the relevant `architecture/`, `testing/`,
     `deployment/`, or `branding/` document, and `roadmap.md`'s status
     log, updated in the *same* change, not deferred to a later cleanup
     pass. This is the rule Phase 6.1 exists to establish going forward —
     see [ADR 0009](decisions/ADR-0009-phase6-roadmap.md).
   - A git commit, with a message describing what changed and why.
   - A git push.
   - A completion report summarizing what changed, what was verified, and
     what (if anything) remains open.

## Reading order for a new session

1. `architecture/system-overview.md`
2. `architecture/tech-stack.md`
3. `architecture/monorepo-structure.md`
4. `architecture/module-dependencies.md`
5. Whichever domain doc is relevant to the task: `architecture/mobile-architecture.md`,
   `architecture/backend-architecture.md`, `architecture/playback-engine.md`,
   `architecture/design-system.md`, `architecture/state-management.md`,
   `architecture/security.md`.
6. `testing/testing-strategy.md` and `deployment/*` if the task touches
   verification or shipping.
7. `branding/branding-v1.md` if the task touches app icon, splash,
   favicon, or logo usage.
8. `decisions/` for the *why* behind any choice that looks unusual.
9. `roadmap.md` to see what phase we're in, what's already been built,
   and what's next.

## A note on historical documents

`architecture/content-model.md` and `architecture/catalog-and-library.md`
describe a superseded product model (an independent-artist upload
platform, replaced by the provider-backed catalog pivot — see
`decisions/0007-provider-backed-music-catalog.md`). They are kept, marked
"superseded" at the top, for historical context on *why* certain schema
and module decisions were made — not as current-state references. Prefer
`architecture/system-overview.md`, `architecture/backend-architecture.md`,
and `architecture/music-provider-architecture.md` for anything about the
current system.
