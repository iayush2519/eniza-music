import { ThemeProvider as DesignSystemThemeProvider, useColorScheme } from '@music-app/design-system';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';

import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const scheme = useColorScheme();

  return (
    <DesignSystemThemeProvider>
      <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppTabs />
      </NavigationThemeProvider>
    </DesignSystemThemeProvider>
  );
}
