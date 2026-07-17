import { Platform } from 'react-native';

/**
 * Layout constants that are genuinely app-shell concerns (tab bar inset,
 * max content width for large/web viewports) rather than design tokens —
 * these stay local to the app rather than living in the design system,
 * which is deliberately platform/shell-agnostic.
 */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
