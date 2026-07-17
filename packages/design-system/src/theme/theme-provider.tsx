import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { darkTheme, lightTheme, Theme } from './theme';
import { useColorScheme } from './use-color-scheme';
import { ColorScheme } from '../tokens/colors';

const ThemeContext = createContext<Theme>(lightTheme);

export type ThemeProviderProps = PropsWithChildren<{
  /**
   * Force a specific scheme instead of following the OS setting. Intended
   * for a future in-app theme override (e.g. a settings toggle); omitted,
   * the provider follows `useColorScheme()`.
   */
  scheme?: ColorScheme;
}>;

export function ThemeProvider({ scheme: forcedScheme, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = forcedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
