# Design System

`packages/design-system` is the single source of visual truth for every app
target. No screen or feature package should define its own color literal,
spacing number, or font size — everything routes through this package's
tokens, theme, or primitives. This is what makes "premium, minimal,
consistent" an enforced property of the codebase rather than a hope.

## Structure

```
packages/design-system/src/
├── tokens/       # Raw design values: colors, spacing, radii, typography, motion
├── theme/        # Theme composition + React context (ThemeProvider/useTheme)
├── primitives/   # Themed components: Text, Surface, VStack/HStack, Button
└── index.ts      # Public API
```

### Tokens (`tokens/`)

- **`colors.ts`** — color *roles* (`background`, `surface`, `accent`,
  `textSecondary`, etc.), not raw hex used directly in components. Two
  concrete palettes (`light`, `dark`) fill in the same role set. See
  "Visual identity" below for the palette itself.
- **`spacing.ts`** — a single spacing scale (`xs` through `huge`) used for
  all padding/margin/gap. No numeric literal spacing in component styles.
- **`radii.ts`** — corner radius scale, kept independent from spacing
  because the two scales grow at different rates in a well-proportioned UI.
- **`typography.ts`** — a type scale where each token
  (`title`, `body`, `caption`, ...) is a complete style object (size +
  line-height + weight), so vertical rhythm is never assembled ad hoc.
- **`motion.ts`** — duration and easing-curve tokens built on
  `react-native-reanimated`'s `Easing`. Durations are fast (120-260ms) by
  design; see "Motion philosophy" below.

### Theme (`theme/`)

`Theme` bundles one color-role palette with the shared scales into a single
object. `ThemeProvider` reads the OS color scheme (with a web-specific
hydration-safe variant, `use-color-scheme.web.ts`, to avoid an SSR/client
flash) and exposes the active `Theme` via `useTheme()`. `ThemeProvider`
also accepts an optional `scheme` override, reserved for a future in-app
theme toggle — not built yet, but the seam exists so adding one later is a
prop, not a rewrite.

### Primitives (`primitives/`)

- **`Text`** — the only text component in the app. Takes a `variant`
  (type-scale token) and `color` (color role).
- **`Surface`** — the only "rectangular themed area" component: cards,
  rows, sheets. Takes a `color` role, `radius` token, and optional
  `bordered`.
- **`VStack` / `HStack`** — flex column/row layout primitives whose only
  spacing input is a `gap` token, so inter-element spacing is never a raw
  number.
- **`Button`** — the only tappable button. Three variants (`primary`,
  `secondary`, `ghost`), each still sharing one animated press-feedback
  interaction (see below).

## Motion philosophy

Per `docs/architecture/overview.md`'s design goals, motion is a first-class
part of the UI, not decoration. Concretely in Phase 2, this means the
`Button` primitive's press feedback (a Reanimated-driven scale-down) is
built into the primitive itself, not left to each call site to add or
forget. Every button in the app therefore automatically gets consistent,
intentional touch feedback. Larger, feature-specific motion (the
mini-player <-> full-player transition, list entrance animations) is
deferred to Phase 7, once there's real content to animate.

## Visual identity

The palette is warm near-black/near-white neutrals (not pure `#000`/`#FFF`)
with a warm amber ("ember", `#FF8A3D`) accent — deliberately not the
green/red/blue already strongly associated with existing streaming
products, per the project's "not a clone" requirement. `accent` is a token
rather than a hardcoded constant specifically so a future dynamic,
artwork-derived accent color (mentioned as a Phase 7 goal in the product
overview) can override it per now-playing session without touching any
component.

Typography uses each platform's native system font (`system-ui` / iOS San
Francisco, `sans-serif` / Android's default) rather than a bundled brand
typeface — see ADR 0004 for why this was deferred rather than decided now.

## Consuming the design system

Any app or package that renders UI depends on `@music-app/design-system`
via `workspace:*` and imports directly from its public entry point:

```tsx
import { Surface, Text, ThemeProvider, useTheme } from '@music-app/design-system';
```

`apps/mobile` is the first real consumer (Phase 2). Its `_layout.tsx` wraps
the app in `ThemeProvider`, and `expo-router`'s own navigation theme
(`DarkTheme`/`DefaultTheme`, which drives native chrome like the status bar
and back-gesture indicator) is derived from the same `useColorScheme()`
source so the two never disagree about which scheme is active.

## What's deliberately not in Phase 2

- No icon set. Icons are added once a real screen needs one, to avoid
  importing an icon library speculatively.
- No dynamic/artwork-derived theming — the token seam exists (`accent` is
  swappable), the actual feature is Phase 7.
- No animated screen-transition primitives (only the `Button` press
  feedback exists) — broader motion work is Phase 7.
- No bundled custom typeface — see ADR 0004.
