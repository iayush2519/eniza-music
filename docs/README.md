# Documentation Index

This folder is the source of truth for architectural decisions on this project.
Future implementation sessions (human or AI) should read these documents
before making structural changes, instead of relying on chat history.

## Structure

- `architecture/` — descriptive documents explaining how each part of the
  system is built and why. Update these when the *shape* of the system
  changes.
- `decisions/` — Architecture Decision Records (ADRs). Immutable once
  accepted; if a decision changes later, write a new ADR that supersedes the
  old one rather than editing it in place.
- `roadmap.md` — phase-by-phase delivery plan and current status.

## Reading order for a new session

1. `architecture/overview.md`
2. `architecture/tech-stack.md`
3. `architecture/monorepo-structure.md`
4. Whichever domain doc is relevant to the task (mobile, backend, audio
   engine, content model, security, design system).
5. `decisions/` for the *why* behind any choice that looks unusual.
6. `roadmap.md` to see what phase we're in and what's already been built.
