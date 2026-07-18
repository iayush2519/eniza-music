import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { darkTheme, lightTheme, Theme } from './theme';
import { ColorScheme } from '../tokens/colors';

const ThemeContext = createContext<Theme>(lightTheme);

export type ThemeProviderProps = PropsWithChildren<{
  /**
   * Force a specific scheme. Intended for a future in-app theme override
   * (e.g. a settings toggle); omitted, the provider always resolves to
   * `light`.
   *
   * ENIZA Version 1.0 is a light-only release — per
   * docs/design/design-system-specification.md's developer handoff
   * checklist ("No dark modes or new accents"), the approved UI board has
   * no dark-mode screens, so nothing in the app should follow the OS
   * color scheme yet. `darkTheme` (see `theme.ts`) is intentionally kept,
   * not deleted, so re-enabling it later is a one-line change to this
   * provider rather than reconstructing the palette from scratch. Until
   * then this provider deliberately does not read `useColorScheme()`.
   */
  scheme?: ColorScheme;
}>;

export function ThemeProvider({ scheme: forcedScheme, children }: ThemeProviderProps) {
  const scheme: ColorScheme = forcedScheme ?? 'light';
  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
