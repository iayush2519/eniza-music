# Marketing Site (`apps/web`)

**Status: current as of this phase (2026-07-21).** New document — describes
`apps/web`, the ENIZA Music marketing/landing site added inside the
existing Turborepo.

## What this is

A single-page, production-ready marketing/landing website introducing
ENIZA Music to visitors and investors. It is **not** part of the product
itself — no authentication, no dashboard, no user accounts, no backend
service, no blog, no pricing/billing system. Those are explicitly out of
scope for this phase; see "What this is not" below.

## Why it's a separate app, not a new mobile screen

`apps/mobile` is the actual product (Android-first, per
`mobile-architecture.md`). `apps/web` is the public-facing website that
introduces that product to people who haven't installed it yet — a
different medium (a browser, not a native app), a different audience
(prospective users/investors, not existing listeners), and a different
tech stack (Next.js/React DOM, not React Native). Splitting it into its
own `apps/*` package keeps it deployable and versioned independently
(straight to Vercel) without coupling its release cadence to the mobile
app's or the API's — see `monorepo-structure.md`'s "apps vs packages"
rule.

## Tech stack

See `tech-stack.md`'s "Marketing site (`apps/web`)" section for the full,
versioned list. In summary: Next.js 15 (App Router), React 19, TypeScript,
Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`), Framer
Motion, Lucide React.

## Structure

```
apps/web/
├── src/
│   ├── app/                 # Next.js App Router: layout, page, SEO routes
│   │   ├── layout.tsx       # <html>/<body>, metadata, JSON-LD
│   │   ├── page.tsx         # Composes every section, in brief order
│   │   ├── globals.css      # Tailwind v4 @theme tokens + base/utility layers
│   │   ├── manifest.ts      # Web app manifest
│   │   ├── robots.ts        # robots.txt
│   │   ├── sitemap.ts       # sitemap.xml
│   │   └── not-found.tsx    # 404 page
│   ├── components/
│   │   ├── layout/          # Navbar, Footer
│   │   ├── sections/        # One component per page section (Hero, Features, ...)
│   │   └── ui/               # Button, GlassCard, Accordion, Reveal, etc.
│   ├── lib/                  # cn(), constants, waitlist-service, use-reduced-motion
│   └── types/                 # waitlist.ts
└── public/
    └── branding/              # Copied (not modified) from assets/branding — see below
```

## Page sections (in order)

Hero, Features, AI Features, How It Works, Product Preview, Roadmap, FAQ,
Waitlist, Footer — each is its own component under
`src/components/sections/`, composed in `src/app/page.tsx`. Every section
owns an `id` used by the Navbar's anchor links.

## Design system relationship

`apps/web` does **not** import `packages/design-system` at runtime — that
package's primitives (`Button`, `Card`, etc.) are React Native components
and cannot run in a DOM environment (see `monorepo-structure.md`'s
dependency-direction rule: nothing in `packages/` targets a browser). It
also isn't bound by the mobile app's Design System v1.0 freeze
(`docs/design/design-system-specification.md`), which is explicitly
light-mode-only and covers `apps/mobile`'s screens, not a new marketing
surface.

What **is** carried over, to keep ENIZA's identity recognizable: the two
brand accent hex values — `accent_blush` (`#E6A8A8`) and `accent_rose`
(`#F5BDBD`) — copied as literal values into `apps/web/src/app/globals.css`'s
own `@theme` block, alongside a new dark canvas and a complementary violet
built specifically for this site's premium dark aesthetic. See that file's
header comment for the full reasoning.

## Branding assets

`apps/web/public/branding/` contains **copies** of three files from the
root `assets/branding/logo/` and `assets/favicon/`/`assets/app-icon/`
directories (`eniza-logo-white.png`, `eniza-master.svg`,
`eniza-logo-black.png`, `favicon.png`, `icon-512.png`). The originals in
`assets/` — Branding Assets v1.0, frozen per `branding-v1.md` — were not
modified, resized, or recolored; they were copied byte-for-byte into
`apps/web/public/` because Next.js serves static assets from an app-local
`public/` directory, not from an arbitrary path elsewhere in the
monorepo.

## Waitlist

The "WAITLIST" requirement ("store submissions in a reusable service...
keep architecture ready for future backend integration") is implemented as
a `WaitlistService` interface (`src/types/waitlist.ts`) with one current
implementation, `localWaitlistService` (`src/lib/waitlist-service.ts`),
backed by `localStorage`. Swapping in a real backend later means writing a
new implementation of the same interface and changing one import in
`waitlist-section.tsx` — no change to the form's validation, UI, or
success/error handling.

## What this is not (explicit scope boundary for this phase)

- No authentication, accounts, or sessions.
- No dashboard or in-product screens.
- No real backend — the waitlist "service" is `localStorage`-backed (see
  above).
- No blog, no pricing/billing system.
- No dependency on `apps/api` or `apps/mobile`, and no changes were made
  to either as part of adding this app.

## Verification performed at integration time (this phase)

- TypeScript, ESLint (`apps/web` pinned to ESLint 9.x — see
  `tech-stack.md`'s ESLint-exception note), and `next build` (production
  build) — all passing.
- Full-workspace `turbo run typecheck`, `turbo run lint`, `turbo run test`
  — all passing across every app/package, confirming zero regression to
  `apps/api`/`apps/mobile`/`packages/*`.
- `git status` confirmed the change is scoped to `apps/web/` (new),
  `pnpm-workspace.yaml`/`pnpm-lock.yaml`/`turbo.json` (workspace wiring),
  and `docs/` — no file under `apps/api/src` or `apps/mobile/src` was
  touched. (`apps/api/test/jest-e2e-setup.ts`/`jest-e2e.json` changes are
  from an unrelated, already-in-progress fix on this branch, not this
  phase's work — see the roadmap entry for that phase.)
- **Not performed:** Vercel deployment itself (no Vercel project/account
  action was taken — this document describes the app as
  deployment-ready, not as deployed). Lighthouse/performance auditing
  was not run in this pass; the production build's reported bundle sizes
  (~175 kB first-load JS for the homepage) are within a reasonable range
  for a landing page using Framer Motion, but no formal Lighthouse score
  is recorded here.

## Running it independently

```bash
pnpm install                                  # from the repo root, once
pnpm --filter @music-app/web dev              # local dev server
pnpm --filter @music-app/web build            # production build
pnpm --filter @music-app/web start            # serve the production build
```

Or via Turborepo's task graph: `turbo run dev --filter=@music-app/web`,
`turbo run build --filter=@music-app/web`, etc. — every task
(`build`/`lint`/`typecheck`/`dev`/`clean`) follows the same script-name
convention as every other app/package in the workspace (see
`monorepo-structure.md`'s "Turborepo task graph" section), so no new task
types were added to `turbo.json`.
