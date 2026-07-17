/**
 * Spacing scale. All layout spacing (padding, margin, gap) in the app must
 * come from this scale — no ad-hoc numeric literals in component styles.
 * This is what keeps a "minimal, premium" visual rhythm consistent across
 * screens instead of every screen inventing its own spacing.
 *
 * The scale is a 4px base rhythm, which is the standard granularity for
 * both iOS and Android layout guidance and divides cleanly for the
 * densities we'll hit on phones and tablets.
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
