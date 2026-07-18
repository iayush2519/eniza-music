/**
 * Corner radius scale. Kept separate from spacing because radius and
 * spacing scales grow at different rates in most premium UIs (radii tend
 * to plateau, spacing keeps growing) — conflating them leads to either
 * overly-rounded large surfaces or overly-sharp small ones.
 *
 * Values are the frozen scale from
 * docs/design/design-system-specification.md §0: radius_md (12, "small
 * inputs, toggles"), radius_lg (16, "default components... input, text
 * inputs"), radius_xl (20, "standard cards..., list items"), radius_xxl
 * (28-32, "primary feature cards, bottom sheets"), radius_pill (999,
 * "CTA buttons, profile avatars"). `md`/`lg` already matched exactly and
 * are unchanged; `xl` moves 24 -> 20 to match; `xxl` is a new token added
 * to complete the frozen set (unconsumed by any component yet — nothing
 * in this phase renders a primary feature card or bottom sheet, but the
 * spec freezes the value regardless, so it's here for Phase 2 to use
 * rather than reintroduced later as a guess). `full` (999) already
 * matched `radius_pill`'s value; kept under its existing name since nothing
 * in the spec dictates a token *name*, only values and usage. `sm` (8) is
 * not one of the spec's five frozen tokens and has no current consumer —
 * left as-is rather than removed or reassigned without a documented
 * target.
 */
export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
