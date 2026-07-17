import { ColorRoles, colors, ColorScheme } from '../tokens/colors';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { typeScale, fontFamily } from '../tokens/typography';

/**
 * A `Theme` bundles every token category behind one object so components
 * only ever need a single `useTheme()` call, rather than importing
 * `spacing`, `radii`, and `colors` separately in every file. The color
 * roles are the only part that actually changes between light/dark; the
 * rest of the scale is shared.
 */
export type Theme = {
  scheme: ColorScheme;
  colors: ColorRoles;
  spacing: typeof spacing;
  radii: typeof radii;
  typeScale: typeof typeScale;
  fontFamily: typeof fontFamily;
};

function createTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: colors[scheme],
    spacing,
    radii,
    typeScale,
    fontFamily,
  };
}

export const lightTheme: Theme = createTheme('light');
export const darkTheme: Theme = createTheme('dark');

export const themes: Record<ColorScheme, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
