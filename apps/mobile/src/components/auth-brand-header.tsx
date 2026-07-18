import { EqualizerGlyph, Text, useReducedMotion, useTheme, VStack } from '@music-app/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const MARK_SIZE = 64;
const GLOW_SIZE = 180;

/**
 * The brand moment shared by Splash and every auth screen — mark,
 * wordmark, a short line of brand voice, and a quiet equalizer motif.
 * Extracted as its own component (rather than duplicated per screen)
 * since Login and the eventual Register redesign both need the exact
 * same treatment; a change to the brand identity should only ever touch
 * this one file.
 *
 * The glow behind the mark "breathes" (a slow, low-amplitude scale
 * pulse) while idle — an abstract, non-literal way to signal "this is a
 * living, musical product" without borrowing literal music iconography.
 * It pauses the instant any field on the screen is focused, via
 * `isPulsing`, so it never competes with the user's actual task.
 */
export function AuthBrandHeader({ tagline, isPulsing = true }: { tagline: string; isPulsing?: boolean }) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (!isPulsing || isReducedMotion) {
      glowScale.value = withTiming(1, { duration: 200 });
      return;
    }
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [isPulsing, isReducedMotion, glowScale]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <VStack align="center" gap="lg">
      <View style={styles.markWrapper}>
        <Animated.View style={[styles.glow, glowAnimatedStyle]}>
          <LinearGradient
            colors={[theme.colors.accentMuted, 'transparent']}
            style={styles.glowFill}
          />
        </Animated.View>
        <View style={[styles.markCircle, { backgroundColor: theme.colors.accent }]}>
          <Text variant="title" color="textOnAccent">
            E
          </Text>
        </View>
      </View>

      <VStack align="center" gap="sm">
        <Text variant="displayMedium" style={styles.wordmark}>
          Eniza
        </Text>
        <EqualizerGlyph size={16} />
        <Text variant="body" color="textSecondary" style={styles.tagline}>
          {tagline}
        </Text>
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  markWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
  glowFill: {
    width: '100%',
    height: '100%',
    borderRadius: GLOW_SIZE / 2,
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
  tagline: {
    textAlign: 'center',
  },
});
