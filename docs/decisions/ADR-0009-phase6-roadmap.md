# ADR 0009: Phase 6 documentation synchronization and roadmap renumbering

**Status:** Accepted
**Date:** 2026-07-20

## Context

By the end of Phase 5.6 (branding integration), the project's documentation
had drifted meaningfully from the actual codebase in several places:

- `docs/roadmap.md`'s status log ended at 2026-07-19, before the Phase 4.5
  provider pivot, the Phase 5 audio engine + full player UI, the OTP/
  password-reset flows, and Phase 5.6's branding integration were actually
  built. Its phase checklist marked Phase 4.5 and 5 as incomplete (`[ ]`)
  despite both being fully implemented, tested, and merged.
- `docs/architecture/backend-architecture.md` still described `discovery`,
  `playback`, `recommendations`, `settings`, and `history` as planned
  modules ("new, replaces `upload`", etc.), when `discovery`, `playback`,
  and `recommendations` were fully built, and `settings`/`history` were
  never built as separate modules at all (their responsibilities were
  absorbed elsewhere or deferred — see the corrected document).
- `docs/architecture/audio-engine.md` and the header comments inside
  `packages/audio-engine/src/playback-engine.ts` and `types.ts` stated "no
  implementation of this interface exists yet" — false as of Phase 5;
  `AndroidPlaybackEngine` and its backing Kotlin native module are real,
  tested, working code.
- No document existed describing the mobile app's actual screen/store/hook
  inventory, the module dependency graph, the current playback pipeline
  end-to-end, the testing setup, deployment status per platform, or the
  Branding Assets v1.0 inventory. Some of this had been described
  correctly once, at design time, in a document that was never revisited
  after implementation; some had never been written down at all.

This is not a new failure mode for this project — ADR 0008's own
"Follow-up" section already flagged that no CI exists to catch
configuration drift automatically, and `docs/architecture/tech-stack.md`
had previously stated an incorrect pnpm baseline version for the same
underlying reason (a document written once, not revisited when the thing
it described changed). Phase 6.1 addresses the specific instance of this
problem found in this review, but the *root cause* — documentation treated
as a one-time deliverable rather than a maintained artifact — needed a
standing rule, not just a one-time fix.

## Decision

### 1. Documentation is synchronized with the actual codebase, not with intent

Every document touched in Phase 6.1 was rewritten by first inspecting the
actual code (module directories, file contents, `package.json`
dependencies, git history) and only then describing it — not by editing
the previous draft's prose. Where a previous document's design-time
description turned out to already match reality, it was kept; where it
didn't, it was corrected and the correction is stated explicitly (e.g.
`playback-engine.md`'s opening paragraph explains exactly what claim in
`audio-engine.md` is now false and why). Superseded documents
(`content-model.md`, `catalog-and-library.md`, `audio-engine.md`) are
kept rather than deleted, for historical context, but are no longer
pointed to as current-state references — `docs/README.md`'s reading order
and "historical documents" note make this explicit.

### 2. Architecture is preserved; nothing here changes what the system does

This phase is documentation-only. No application code, UI layout, design
tokens, or branding asset files were modified. The monorepo shape, the
modular-monolith backend, the provider-backed catalog pattern
(`decisions/0007`), and the `PlaybackEngine` contract are all described
more accurately, not changed. Where a document previously described a
module (`settings`, `history`) as if it existed, the correction is to say
plainly that it doesn't yet — not to build it now. Any actual architecture
change remains subject to Rule 4 of the Project Standards (a new ADR
first, implementation second) established below.

### 3. Roadmap phase numbers are renumbered under a `6.x` scheme, and here's why

The previous roadmap (pre-Phase-6.1) used top-level integers for future
work: "Phase 6 — Offline & downloads", "Phase 7 — Motion & polish", "Phase
8 — QA & security hardening", "Phase 9 — CI/CD & deployment shape." The
Phase 6.0 planning review (completed immediately before this phase)
identified a materially different priority order than that original
numbering implied — in particular:

- A real OTP delivery provider (replacing the dev-only console stub) and
  a CI/CD pipeline are both more urgent than offline downloads or motion
  polish, but neither had a phase number at all in the old scheme (OTP
  delivery wasn't tracked as a phase; CI/CD was Phase 9, implying it comes
  *after* offline downloads and motion polish, which does not reflect
  the actual risk ordering).
- Settings and QA/security hardening were similarly under-prioritized by
  their position in the old linear numbering relative to what a
  full-codebase review actually surfaces as risk.

Renumbering everything under `6.x` (6.2 through 6.9, in priority order:
Critical → High → High → High → Medium → Medium → Medium →
Low–Medium) rather than continuing the old `6, 7, 8, 9` scheme keeps all
of "the remaining work identified by the Phase 6.0 review" grouped under
one phase number, with sub-numbers reflecting priority order rather than
an arbitrary sequence decided before that review happened. Old "Phase 6"
(offline & downloads) becomes 6.6; old "Phase 7" (motion & polish) becomes
6.8; old "Phase 9" (CI/CD) becomes 6.4, moved earlier because the Phase
6.0 review concluded it should be. Nothing in this renumbering removes or
descopes any previously-planned work — every item from the old Phase
6–9 list has a corresponding `6.x` entry in the new roadmap.

### 4. Future milestones follow a fixed completion checklist

Every milestone from this point forward — not just documentation
milestones — must satisfy, before being considered complete:

1. TypeScript verification.
2. ESLint verification.
3. Jest verification.
4. Android verification, when the change touches native code, `app.json`,
   or branding assets.
5. A documentation update, in the same change — not deferred.
6. A git commit.
7. A git push.
8. A completion report.

This list is not new invention: items 1–4 and 6–8 were already the de
facto practice for every phase since Phase 3 (visible in every prior
phase's completion report). Item 5 — documentation updated *in the same
change* — is the one genuinely new rule, added specifically because its
absence is what caused the drift this ADR exists to fix. It is recorded
permanently in `docs/README.md`'s "Project Standards" section, not just in
this ADR, so it is discoverable without reading ADR history.

## Alternatives considered

- **Fix only `roadmap.md` and leave the architecture docs as historical
  snapshots.** Rejected: `docs/README.md`'s own stated reading order tells
  a new session to read `architecture/*` before `roadmap.md`. Leaving
  those docs stale while only fixing the roadmap would mean a new session
  reads incorrect information *first*, then a correction *second* — worse
  than not having the correction be reachable at all in the right order.
- **Delete the superseded documents instead of marking them historical.**
  Rejected: `content-model.md` and `catalog-and-library.md` contain real
  design reasoning (why `library_entries` is one polymorphic table, why
  `playlist_tracks.position` is a real column, why local cache ids are
  referenced instead of raw provider ids) that is still true and still
  useful, and deleting it would lose that reasoning for no benefit — the
  problem was staleness of *current-state* claims, not the presence of
  historical ones.
- **Keep the old linear phase numbering (10, 11, 12...) instead of a `6.x`
  scheme.** Rejected: the old numbering already had gaps and reordering
  implied by nothing (`6` then `7` then `8` then `9` with no stated
  reason for that order beyond when each was originally sketched).
  Grouping the Phase 6.0 review's output under one number with
  priority-ordered sub-numbers makes the *reason* for the ordering visible
  in the numbering itself, which the old scheme did not.
- **Do not add a permanent "documentation in the same change" rule; treat
  this synchronization as a one-off cleanup.** Rejected: this is the
  second documented instance of the same root cause (the first being ADR
  0008's tech-stack.md version drift). A one-off fix does not change the
  process that produced the drift twice already.

## Consequences

- `docs/roadmap.md` is now the single authoritative status source, and is
  expected to be updated at the end of every future phase, not just
  audited periodically.
- Nine new documents exist that didn't before:
  `architecture/system-overview.md`, `architecture/mobile-architecture.md`,
  `architecture/module-dependencies.md`, `architecture/playback-engine.md`,
  `testing/testing-strategy.md`, `deployment/android.md`,
  `deployment/ios.md`, `deployment/ci-cd.md`, `branding/branding-v1.md`.
- `architecture/backend-architecture.md` was rewritten in place (not
  superseded) since its subject — the backend's current module set — is
  exactly the kind of "current state" document that should always reflect
  reality, unlike `content-model.md`/`catalog-and-library.md` which
  describe a retired model by design.
- Every future phase's completion report is expected to reference which
  documents it updated, per the new Project Standards checklist — a
  completion report with no documentation-update line item should be
  treated as incomplete.
- No code, tests, UI, or branding assets changed as a result of this ADR
  or the phase it documents.
