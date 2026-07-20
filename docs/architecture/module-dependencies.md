# Module Dependencies

**Status: current as of Phase 6.1 (2026-07-20).** New document — this
graph did not previously exist in one place; the dependency-direction rule
lived only as a short section in `monorepo-structure.md`. This file makes
the actual, current dependency edges explicit at both the
package/app level and the backend-module level, since neither existed in
this level of detail before.

## Package/app dependency graph

```
apps/mobile
  ├── @music-app/design-system   (UI primitives, tokens, theme)
  ├── @music-app/audio-engine    (PlaybackEngine + AndroidPlaybackEngine)
  ├── @music-app/shared-types    (DTOs)
  ├── @music-app/api-client      (typed HTTP layer)
  └── @music-app/config          (tsconfig/eslint/prettier — dev-time only)

apps/api
  ├── @music-app/shared-types    (backend DTOs `implements` these)
  └── @music-app/config          (dev-time only)

packages/api-client
  ├── @music-app/shared-types
  └── @music-app/config

packages/design-system
  └── @music-app/config

packages/audio-engine
  └── @music-app/config
  (deliberately does NOT depend on @music-app/api-client — see
   "audio-engine's dependency-light boundary" below)

packages/shared-types      — no internal dependencies (a leaf)
packages/config            — no internal dependencies (a leaf)
```

**Hard rule, unchanged since ADR 0001:** nothing in `packages/` ever
depends on anything in `apps/`. This is enforced by convention (there is
no lint rule for it yet — a possible Phase 6.4/6.5 addition, see
`system-overview.md`'s Technical Debt section) and verified by inspection
of each package's `package.json` during this review; no violation exists
today.

## Why `audio-engine` doesn't depend on `api-client`

`packages/audio-engine/src/types.ts` defines a `StreamUrlProvider`
interface — the minimal shape (`resolveStreamUrl(trackId)`) a caller must
supply to resolve a queue item's stream URL. `@music-app/api-client`'s
`PlaybackClient` *structurally* satisfies this interface without
`audio-engine` importing `api-client` at all. This keeps `audio-engine`
dependency-light, consistent with its role as a platform-abstraction
boundary (see [`playback-engine.md`](./playback-engine.md)) — whatever
wires a `PlaybackEngine` up (currently only `apps/mobile`) is what
supplies the real `PlaybackClient`.

## Backend module dependency graph (`apps/api/src/`)

```
AppModule
  ├── DatabaseModule        (@Global — DATABASE_CONNECTION token)
  ├── UsersModule
  ├── AuthModule            → UsersModule (user lookup during login)
  ├── CatalogModule         → DatabaseModule
  ├── LibraryModule         → DatabaseModule, CatalogModule (entity existence checks)
  ├── DiscoveryModule       → CatalogModule (upserts into cache tables), QueueModule
  ├── PlaybackModule        → DiscoveryModule (MusicGateway), DatabaseModule (listening_history)
  └── RecommendationsModule → DiscoveryModule (MusicGateway), DatabaseModule
```

`QueueModule` is not listed in `AppModule`'s own `imports` — it's imported
by `DiscoveryModule` directly, since metadata refresh jobs are a
`discovery`-internal concern (see `queue.module.ts`'s own doc comment for
why `BullMqMetadataRefreshQueue` is constructed manually behind a factory
rather than listed as a plain Nest provider).

**Rule, matching the `MusicGateway`/`storage` precedent:** no module other
than `discovery` ever imports a `MusicProvider` adapter directly, and no
module other than `queue`'s consumers ever touches BullMQ/Redis connection
details directly.

## Shared contract enforcement

`packages/shared-types` is the compile-time boundary between `apps/api`
and `apps/mobile`. Every backend response DTO (`TrackResponseDto`,
`PlaylistResponseDto`, etc., in each module's `dto/` folder) `implements`
the matching type from `shared-types` — a DTO that drifts from the shared
contract (a renamed field, a changed nullability) fails to compile on the
backend, catching the drift at build time rather than as a runtime
mismatch discovered later on the mobile client.

## Turborepo task graph

Unchanged from `monorepo-structure.md`: `build` depends on `^build`
(dependencies build first, cached); `lint`/`typecheck` are cached with no
ordering dependency; `test` depends on `^build` where a package produces
JS consumed by tests; `dev` is uncached and persistent.

## Known gaps in this graph

- There is no automated check that the dependency-direction rule
  (`packages/` never imports `apps/`) holds — it's verified by manual
  inspection during documentation reviews like this one, not by a lint
  rule or CI job. Worth adding once Phase 6.4 (CI/CD) exists to enforce
  it automatically rather than relying on inspection.
