import { Surface, Text } from '@music-app/design-system';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/layout';

// Placeholder home screen. Real catalog/library UI is built starting in
// Phase 4 (see docs/roadmap.md). This screen only exists so the app has a
// working entry point to verify navigation, theming, and the build
// pipeline during Phase 1-3.
export default function HomeScreen() {
  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="title" style={styles.title}>
          Home
        </Text>
        <Text variant="label" color="textSecondary" style={styles.subtitle}>
          Catalog and library screens land in Phase 4.
        </Text>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: BottomTabInset + 16,
    maxWidth: MaxContentWidth,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
