/**
 * Elevation levels, expressed as platform-specific shadow specs rather
 * than a single cross-platform shadow value — Android's `elevation` is
 * cheap and idiomatic; iOS shadows are drawn per-frame and should stay
 * modest. A single shared "shadow" value would either look wrong on
 * Android (too subtle) or be expensive on iOS (too heavy).
 *
 * `shadowColor` is deliberately not part of this spec — callers should
 * pass the active theme's `text` color role as `shadowColor` (see
 * `Button`'s primary variant), so shadows read as warm-neutral rather
 * than the cold, pure-black default most RN shadows end up with. Note
 * this only affects iOS: Android's `elevation` renders a fixed-tint
 * system shadow that isn't recolorable via style props.
 */
export type ElevationToken = 'flat' | 'raised' | 'floating' | 'overlay';

type ElevationSpec = {
  androidElevation: number;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetHeight: number;
};

export const elevation: Record<ElevationToken, ElevationSpec> = {
  flat: { androidElevation: 0, shadowOpacity: 0, shadowRadius: 0, shadowOffsetHeight: 0 },
  raised: { androidElevation: 1, shadowOpacity: 0.06, shadowRadius: 4, shadowOffsetHeight: 1 },
  floating: { androidElevation: 4, shadowOpacity: 0.12, shadowRadius: 12, shadowOffsetHeight: 4 },
  overlay: { androidElevation: 8, shadowOpacity: 0.18, shadowRadius: 24, shadowOffsetHeight: 8 },
};
