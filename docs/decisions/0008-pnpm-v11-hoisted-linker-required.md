# ADR 0008: pnpm v11 requires `nodeLinker: hoisted` in `pnpm-workspace.yaml`, not `.npmrc`

**Status:** Accepted
**Date:** 2026-07-18

## Context

`apps/mobile`'s Android native build (React Native's CMake/Ninja C++ build,
used by `react-native-screens`, `react-native-worklets`, and
`react-native-reanimated`) started failing on Windows with:

```
ninja: error: manifest 'build.ninja' still dirty after 100 tries
```

preceded by repeated CMake warnings of the form:

```
CMake Warning in CMakeLists.txt:
  The object file directory
    <path>/.cxx/Debug/<hash>/arm64-v8a/CMakeFiles/<target>.dir/./
  has <N> characters. The maximum full path to an object file is 250
  characters (see CMAKE_OBJECT_PATH_MAX).
```

This reproduced with `newArchEnabled` both `true` and `false`, and was
independent of Java/NDK/CMake/AGP versions and project path length (already
at the short `C:\dev\eniza`). Those were all correctly ruled out before this
was investigated as an environment problem — the actual cause was a
dependency-resolution change.

### Root cause

`.npmrc` declared:

```
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
```

with hoisting chosen specifically so React Native's native module paths
stay short on Windows (see the "Known exception" reasoning that used to
live only as an inline comment — now captured properly below).

The workspace's pinned package manager is `pnpm@11.13.1`
(`package.json#packageManager`). As of **pnpm v11**, `.npmrc` is read
*only* for auth/registry settings — every other setting, including
`node-linker`, must live in `pnpm-workspace.yaml` (camelCase key) or the
global config. This is a documented, intentional breaking change in pnpm's
v10→v11 migration, not a bug.

Because `pnpm-workspace.yaml` had no `nodeLinker` key, the setting was
silently dropped and pnpm fell back to its default `isolated` linker. Every
native module then resolved through:

```
node_modules/.pnpm/<pkg>@<version>_<contenthash>/node_modules/<pkg>/...
```

instead of the intended:

```
node_modules/<pkg>/...
```

The extra `.pnpm/<pkg>@<version>_<contenthash>/node_modules/<pkg>` segment
adds roughly 90+ characters before the native `.cxx` build tree even
starts, which reliably pushed `react-native-screens` and
`react-native-worklets` object file paths past CMake's 250-character
`CMAKE_OBJECT_PATH_MAX` limit on Windows. CMake's Windows short-path
fallback for over-limit paths doesn't converge consistently between
reconfigure passes for paths this close to (rather than wildly over) the
limit, which is why Ninja could never stabilize its build graph — hence
"still dirty after 100 tries" instead of a clean failure.

This has nothing to do with the native Android toolchain (Java, NDK, CMake,
AGP) and is unaffected by the New Architecture flag, because both old and
new architecture use the same CMake/prefab native build for these
libraries.

## Decision

Move the hoisting-related settings from `.npmrc` into `pnpm-workspace.yaml`
using pnpm v11's camelCase keys:

```yaml
nodeLinker: hoisted
strictPeerDependencies: false
autoInstallPeers: true
```

`.npmrc` now only carries a comment pointing here; it no longer declares
these settings, since pnpm v11 ignores them there.

## Alternatives considered

- **Downgrade to pnpm v10.** Rejected: papers over the actual problem
  (config location, not pnpm version) and drifts the pinned package manager
  away from what's declared in `package.json#packageManager`, which is
  itself a source of truth we rely on for reproducible installs.
- **Increase `CMAKE_OBJECT_PATH_MAX` or inject `externalNativeBuild` args
  per-module.** Rejected: would require patching third-party native module
  build files (`react-native-screens`, `react-native-worklets`) directly or
  via patch-package, adding maintenance burden every time those packages
  update their CMake config, for a problem that has a zero-cost fix at the
  package-manager config layer.
- **Switch `virtualStoreDir` to a very short path (e.g. `C:\.pnpm-store`) to
  keep isolated linking.** Rejected: isolated linking was never the
  intended mode for this project in the first place — React Native/Metro's
  module resolution already has known friction with pnpm's symlinked
  `node_modules/.pnpm` structure independent of the Windows path issue (see
  the original hoisting rationale, now inlined in `pnpm-workspace.yaml`).
  Fixing path length without also fixing linker mode would leave the
  Metro-compatibility motivation for hoisting unaddressed.

## Consequences

- `apps/mobile`'s native module paths are short again
  (`node_modules/<pkg>/android/.cxx/...`), so the Android CMake/Ninja build
  is no longer at risk of `CMAKE_OBJECT_PATH_MAX` on Windows for any
  current or future native dependency.
- Hoisted linking means the workspace trades some of pnpm's strict
  dependency isolation (no phantom dependencies) for React Native ecosystem
  compatibility. This is the same tradeoff the project already accepted
  when `.npmrc` was first written — this ADR does not change the tradeoff,
  only where it's correctly configured.
- A full `node_modules` wipe and reinstall was required after this change,
  because pnpm does not retroactively relink an already-installed isolated
  tree into a hoisted one; stale Gradle `.cxx`/`.gradle` caches referencing
  old `.pnpm` paths also had to be cleared. Anyone pulling this change needs
  to do the same (`rm -rf node_modules && pnpm install`, plus clear
  `apps/mobile/android/.gradle` and any `**/android/.cxx` if they still hit
  stale-path errors).
- `docs/architecture/tech-stack.md` previously stated pnpm `9.x` as the
  baseline while `package.json` had already moved to `11.13.1`. That doc is
  corrected alongside this ADR (see below). This kind of drift is exactly
  what let a two-major-version pnpm bump ship without anyone re-checking
  whether `.npmrc`-based settings still applied.

## Follow-up / flagged for future work (not done in this change)

- **No CI pipeline exists yet** (`tech-stack.md` names GitHub Actions as
  the plan; no `.github/workflows` currently exists). A CI job that runs
  `pnpm install` on a matrix including Windows, or at minimum lints that
  `pnpm-workspace.yaml` and `.npmrc` aren't declaring settings pnpm's
  active major version will ignore, would have caught this automatically
  instead of requiring someone to hit a broken native build locally. Worth
  prioritizing before the next dependency-manager major bump.
- Consider a lightweight pre-commit or CI check that fails if `.npmrc`
  contains any key other than `registry`/auth-related keys while
  `package.json#packageManager` is pinned to pnpm >=11, to prevent this
  exact regression class from recurring silently.
