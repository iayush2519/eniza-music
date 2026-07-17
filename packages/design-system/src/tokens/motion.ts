import { Easing } from 'react-native-reanimated';

/**
 * Motion tokens: durations and easing curves shared by every animated
 * interaction in the app. Centralizing these means a single design
 * decision ("our transitions feel snappy, not bouncy") is expressed once
 * and inherited everywhere, rather than every screen picking its own feel.
 *
 * Values are deliberately on the faster end (120-260ms) — the product goal
 * is "fast, intelligent" motion, not the slower, more theatrical
 * transitions common in media-player UIs we are explicitly not copying.
 */
export const duration = {
  instant: 80,
  fast: 120,
  base: 180,
  slow: 260,
  deliberate: 400,
} as const;

export type DurationToken = keyof typeof duration;

/**
 * Easing curves. `standard` is used for most enter/exit transitions.
 * `emphasized` is reserved for the handful of "hero" interactions (e.g. the
 * mini-player -> full-player expansion in Phase 5) where a more expressive
 * curve is appropriate.
 */
export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  emphasized: Easing.bezier(0.3, 0, 0.1, 1),
  linear: Easing.linear,
} as const;

export type EasingToken = keyof typeof easing;
