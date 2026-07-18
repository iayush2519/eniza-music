import { Surface, Text, useTheme } from '@music-app/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Shown only until the initial "is there already a session?" check
 * (`useAuthStore.bootstrap`) *and* the onboarding-seen check
 * (`useOnboardingStore.load`) have both resolved — see `_layout.tsx`'s
 * combined guard. This is a brand moment, not a spinner: it exists to
 * make the very first thing a user sees feel intentional, while adding
 * no meaningful delay of its own — the animation plays out over the same
 * window those two async checks are already running in, never gating on
 * top of them.
 */
export default function SplashScreen() {
  const theme = useTheme();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.04, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [opacity, scale]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Surface style={styles.root}>
      <LinearGradient
        colors={[theme.colors.accentMuted, theme.colors.background]}
        style={styles.backgroundGlow}
        pointerEvents="none"
      />

      <Animated.View style={[styles.markWrapper, markStyle]}>
        <View style={[styles.markCircle, { backgroundColor: theme.colors.accent }]}>
          <Text variant="displayMedium" color="textOnAccent">
            E
          </Text>
        </View>
        <Text variant="title" style={styles.wordmark}>
          Eniza
        </Text>
      </Animated.View>
    </Surface>
  );
}

const MARK_SIZE = 72;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  markWrapper: {
    alignItems: 'center',
    gap: 16,
  },
  markCircle: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    letterSpacing: 0.5,
  },
});
