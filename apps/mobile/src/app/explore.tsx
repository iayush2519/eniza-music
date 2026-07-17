import { Surface, Text, useTheme } from '@music-app/design-system';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/layout';

// Placeholder explore/search screen. Real catalog browsing lands in Phase 4
// (see docs/roadmap.md). This screen only exists so the tab navigator has a
// second working destination during Phase 1-3.
export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + 16,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: 64,
      paddingBottom: 24,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <Surface style={styles.container}>
        <Text variant="subtitle">Explore</Text>
        <Text style={styles.centerText} color="textSecondary">
          Catalog browsing and search land in Phase 4.
        </Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  centerText: {
    textAlign: 'center',
  },
});
