# Branding Assets v1.0

**Status: FROZEN, as of Phase 5.6 (2026-07-20), documented as of Phase
6.1.** This is the first time this asset inventory has been written down
in `docs/`; the Phase 5.6 completion report covered the integration work
itself, but no permanent document existed until now. This document is the
canonical reference for what Branding Assets v1.0 contains and where each
asset is used — see "Project Standards" in
[`../README.md`](../README.md) for the freeze rule itself.

## Freeze rule

**Branding Assets v1.0 are frozen.** No file under `assets/app-icon/`,
`assets/branding/`, `assets/favicon/`, or `assets/splash/` may be
redesigned, recolored, resized, cropped, regenerated, or replaced without
an explicit, separate approval — tracked via a new ADR if it ever happens,
per this project's permanent standards (see `../README.md`). Referencing
these files from new configuration (e.g. a future iOS icon config) is
permitted; modifying the files themselves is not.

## Asset inventory (current, as of Phase 5.6)

| Path | Purpose |
|---|---|
| `assets/app-icon/icon-1024.png` | Master app icon (2048×2048) — used as both the Expo app icon and the Android adaptive icon foreground |
| `assets/branding/logo/eniza-master.svg` | Master vector logo lockup |
| `assets/branding/logo/eniza-primary.png` | Primary logo raster (2816×1536) |
| `assets/branding/logo/eniza-primary@1x.png` | Primary logo raster, 1x density (2048×2048) |
| `assets/branding/logo/eniza-primary@2x.png` | Primary logo raster, 2x density (2048×2048) |
| `assets/branding/logo/eniza-logo-black.png` | Logo lockup, black variant (2048×2048) |
| `assets/branding/logo/eniza-logo-white.png` | Logo lockup, white variant (2048×2048) |
| `assets/branding/logo/eniza-monochrome.png` | Monochrome mark — used as the Android adaptive icon monochrome layer (2048×2048) |
| `assets/favicon/favicon-512.png` | Web favicon source (2816×1536) |
| `assets/splash/splash-logo.png` | Splash screen logo (2816×1536) |

## Where each asset is wired in (current, `apps/mobile/app.json`)

```json
{
  "icon": "../../assets/app-icon/icon-1024.png",
  "android": {
    "adaptiveIcon": {
      "backgroundColor": "#FFFFFF",
      "foregroundImage": "../../assets/app-icon/icon-1024.png",
      "monochromeImage": "../../assets/branding/logo/eniza-monochrome.png"
    }
  },
  "web": {
    "favicon": "../../assets/favicon/favicon-512.png"
  },
  "plugins": [
    ["expo-splash-screen", {
      "backgroundColor": "#FFFFFF",
      "image": "../../assets/splash/splash-logo.png",
      "imageWidth": 200
    }]
  ]
}
```

Adaptive icon background is a solid `#FFFFFF` (previously a placeholder
blue, `#E6F4FE`, removed during Phase 5.6). Splash screen background is
also `#FFFFFF`. Both are configuration values in `app.json`, not part of
the frozen asset files themselves — changing either would be a
configuration change, not a branding-asset change, though it should still
be treated conservatively given the design system's frozen visual
identity (see [`../design/design-system-specification.md`](../design/design-system-specification.md)).

## What was removed during integration (Phase 5.6)

Superseded placeholder branding was removed, not left alongside the real
assets, to avoid two sources of truth:

- `apps/mobile/assets/images/icon.png`, `favicon.png`, `splash-icon.png`,
  `android-icon-foreground.png`, `android-icon-background.png`,
  `android-icon-monochrome.png` (Expo default template placeholders)
- `apps/mobile/assets/expo.icon/` (an unused iOS Icon Composer bundle —
  removed because `apps/mobile/app.json` no longer sets `ios.icon`; no iOS
  icon has been designed or approved yet, so nothing was configured in its
  place — see [`../deployment/ios.md`](../deployment/ios.md))

## Verification performed at integration time (Phase 5.6)

- TypeScript, ESLint, Jest — all passing.
- Full Android debug build (`gradlew assembleDebug`) — successful.
- Generated native resource inspection: adaptive icon XML
  (`mipmap-anydpi-v26/ic_launcher.xml`) correctly references the new
  layers; splash screen theme (`values/styles.xml`) correctly references
  the new drawable and background color; pixel-level aspect-ratio check
  on the generated splash drawable confirmed no distortion (source ratio
  1.833 vs. generated content-span ratio 1.837 — matches within rounding).
- **Not performed:** live on-device/emulator visual verification (no
  emulator was available in that working session). This is a disclosed
  gap, not an assumed-equivalent substitute — see
  [`../deployment/android.md`](../deployment/android.md)'s "Known gaps".

## What is not yet covered by Branding Assets v1.0

- **iOS app icon** — no asset exists, no icon has been designed. See
  [`../deployment/ios.md`](../deployment/ios.md).
- **Marketing/store-listing assets** (Play Store feature graphic,
  screenshots, etc.) — out of scope for v1.0; not needed until an actual
  store listing is created (no timeline committed — see
  [`../deployment/android.md`](../deployment/android.md)'s "Planned"
  section).
