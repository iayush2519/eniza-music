# Monorepo Structure

Managed with **pnpm workspaces** + **Turborepo** for task orchestration and
caching.

```
music-app/
├── apps/
│   ├── mobile/              # Expo app (Android first, iOS/tablet/web later)
│   └── api/                 # NestJS backend
├── packages/
│   ├── shared-types/        # DTOs / API contracts shared between mobile and api
│   ├── design-system/       # Design tokens + themed primitive components
│   ├── audio-engine/        # Native audio module + JS interface (platform-abstracted)
│   ├── api-client/          # Typed fetch layer built on shared-types + OpenAPI
│   └── config/              # Shared tsconfig, eslint, prettier bases
├── docs/                    # This documentation
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .github/workflows/       # CI (added in a later phase)
```

## Why this split

- **`apps/` vs `packages/`** — apps are deployable units (a mobile binary, a
  backend service). Packages are internal libraries consumed by one or more
  apps. Nothing in `packages/` should import from `apps/`.
- **`shared-types`** exists so the mobile app and backend can never silently
  drift on the shape of an API response — both import the same TypeScript
  types. When the backend's OpenAPI schema changes, `api-client` regenerates
  against it.
- **`design-system`** is a separate package (not just a folder inside
  `apps/mobile`) because it's the piece most likely to be reused verbatim
  when we add tablet/desktop/web targets. Keeping it decoupled from
  `apps/mobile` now avoids a painful extraction later.
- **`audio-engine`** is isolated because it contains real native complexity
  (Kotlin, Media3, Expo config plugin). Isolating it: (a) keeps that
  complexity out of app-level code, (b) makes it independently testable,
  and (c) makes a future engine swap a package-level change, not an
  app-wide refactor.
- **`config`** centralizes lint/format/tsconfig so every package and app
  extends the same base instead of copy-pasting config.

## Dependency direction

```
apps/mobile      → design-system, audio-engine, shared-types, api-client, config
apps/api         → shared-types, config
packages/api-client → shared-types, config
packages/design-system → config
packages/audio-engine  → config
```

No package ever depends on an app. `shared-types` and `config` have no
internal dependencies — they are the leaves of the graph.

## Turborepo task graph

Baseline tasks defined in `turbo.json`, run consistently across every
package/app via matching `package.json` scripts:

- `build` — depends on `^build` (build dependencies first), cached.
- `lint` — cached, no dependency ordering needed.
- `typecheck` — cached.
- `test` — depends on `^build` where a package produces JS consumed by tests.
- `dev` — not cached, persistent (used for `expo start`, `nest start --watch`).

## Versioning approach

All internal packages are versioned as `0.0.0` and referenced via the
workspace protocol (`workspace:*`) — they are never published to a registry.
This is an internal-only monorepo, not a collection of public libraries.
