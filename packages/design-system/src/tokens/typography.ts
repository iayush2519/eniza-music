import { Platform } from 'react-native';

/**
 * Font families. We lean on each platform's native system font rather than
 * bundling a custom typeface in Phase 2 — a bundled brand typeface is a
 * visual-identity decision better made once real screens exist to judge it
 * against (tracked for the Phase 7 polish pass), and native system fonts
 * already give us the "fast, native-feeling" quality the product goals
 * call for with zero bundle-size cost.
 */
export const fontFamily = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'system-ui',
    mono: 'monospace',
  },
});

/**
 * Type scale. Each entry is a complete, ready-to-spread style object
 * (fontSize + lineHeight + fontWeight) rather than independent scales for
 * each property — this guarantees every "title" in the app has the exact
 * same vertical rhythm, rather than screens mixing a title's fontSize with
 * an inconsistent lineHeight.
 */
export const typeScale = {
  displayLarge: { fontSize: 40, lineHeight: 46, fontWeight: '700' as const },
  displayMedium: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
