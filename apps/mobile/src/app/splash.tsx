import { Surface, Text } from '@music-app/design-system';
import { StyleSheet } from 'react-native';

/**
 * Shown only until the initial "is there already a session?" check
 * (`useAuthStore.bootstrap`) resolves — see `_layout.tsx`'s
 * `Stack.Protected guard={!isBootstrapped}`. Exists so the app never
 * flashes the login screen before that check has had a chance to run.
 */
export default function SplashScreen() {
  return (
    <Surface style={styles.root}>
      <Text variant="body" color="textSecondary">
        Loading...
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
