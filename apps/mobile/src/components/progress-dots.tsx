import { useTheme } from '@music-app/design-system';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

type ProgressDotsProps = {
  count: number;
  /**
   * Continuous scroll progress in page units (e.g. `contentOffset.x /
   * pageWidth`), not a discrete index — this is what lets each dot
   * animate smoothly mid-swipe instead of snapping only once a page
   * fully settles.
   */
  progress: SharedValue<number>;
};

/**
 * A generic paged-progress indicator. Not tied to onboarding's content —
 * it only needs a page count and a continuous progress value — so it's
 * reusable anywhere else a horizontally-paged flow needs one (e.g. a
 * future multi-step form), matching the "everything must be reusable"
 * requirement rather than being onboarding-specific.
 */
export function ProgressDots({ count, progress }: ProgressDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
}

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - index), 1);
    return {
      width: 24 - distance * 16,
      backgroundColor: interpolateColor(distance, [0, 1], [theme.colors.accent, theme.colors.border]),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
