/**
 * Spacing scale. All layout spacing (padding, margin, gap) in the app must
 * come from this scale — no ad-hoc numeric literals in component styles.
 * This is what keeps a "minimal, premium" visual rhythm consistent across
 * screens instead of every screen inventing its own spacing.
 *
 * Values are the frozen 8px-grid scale from
 * docs/design/design-system-specification.md §0
 * (spacing_tight/base/md/lg/xl = 4/8/16/24/32), which the spec's developer
 * handoff checklist requires strictly ("No custom spacing"). Existing
 * token *names* are kept (xs/sm/md/.../huge) since the spec doesn't
 * dictate variable names, only values — but `md` moves from 12 -> 16 to
 * land back on the grid: 12 isn't a multiple of 8 and isn't one of the
 * spec's five frozen values, so it was a real violation this pass fixes,
 * not a stylistic choice. `lg`/`xl` shift up one slot accordingly
 * (16->24, 24->32) to keep the scale strictly increasing and matching the
 * spec's md/lg/xl in order; `xxl` moves 32->40 so it no longer collides
 * with `xl`'s corrected value. `xxxl`/`huge` (48/64) are unspecified by
 * the frozen doc but already sat on the 8px grid above the spec's max
 * (32), so they're left as-is.
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
