/**
 * Corner radius scale. Kept separate from spacing because radius and
 * spacing scales grow at different rates in most premium UIs (radii tend
 * to plateau, spacing keeps growing) — conflating them leads to either
 * overly-rounded large surfaces or overly-sharp small ones.
 */
export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
