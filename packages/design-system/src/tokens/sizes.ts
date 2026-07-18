/**
 * Icon size scale. Kept separate from `radii`/`spacing` — icon sizing
 * follows its own small, deliberately short scale (per
 * docs/architecture/design-system.md's icon guidelines: "sizes are
 * tokens, not literals") rather than borrowing a scale designed for
 * spacing or corner radius, which grow at different rates.
 */
export const iconSizes = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export type IconSizeToken = keyof typeof iconSizes;
