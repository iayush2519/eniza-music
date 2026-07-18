import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';

export type EqualizerGlyphProps = {
  /** Color role for the bars. Defaults to `accent`. */
  color?: ColorRole;
  /**
   * Static (no motion) or animated (bars bounce continuously). The same
   * glyph serves two roles: a quiet brand motif at rest (`static`, e.g.
   * beneath the Login wordmark) and a functional loading indicator once
   * animated (e.g. inside a submitting Button) — one motif, two jobs,
   * rather than two separate assets.
   */
  animated?: boolean;
  size?: number;
};

// Relative peak heights per bar, as a fraction of `size` — deliberately
// uneven (not a uniform bounce) so it reads as a plausible equalizer
// rather than a mechanical loading spinner.
const BAR_PEAK_HEIGHTS = [0.5, 1, 0.65, 0.85];

/**
 * A minimal 4-bar equalizer motif — see docs/architecture/design-system.md
 * and the Login screen's approved design concept. Deliberately abstract
 * (no waveform/headphone/note iconography) so it signals "this is a music
 * product" without borrowing visual language from any specific
 * competitor.
 */
export function EqualizerGlyph({ color = 'accent', animated = false, size = 16 }: EqualizerGlyphProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !isReducedMotion;
  const barColor = theme.colors[color];

  return (
    <View style={[styles.row, { height: size, gap: size * 0.15 }]} accessibilityElementsHidden>
      {BAR_PEAK_HEIGHTS.map((peak, index) => (
        <Bar
          key={index}
          peakHeight={peak * size}
          minHeight={size * 0.2}
          color={barColor}
          width={size * 0.18}
          animated={shouldAnimate}
          delay={index * 90}
        />
      ))}
    </View>
  );
}

type BarProps = {
  peakHeight: number;
  minHeight: number;
  color: string;
  width: number;
  animated: boolean;
  delay: number;
};

function Bar({ peakHeight, minHeight, color, width, animated, delay }: BarProps) {
  const height = useSharedValue(animated ? minHeight : peakHeight);

  useEffect(() => {
    if (!animated) {
      height.value = withTiming(peakHeight, { duration: 150 });
      return;
    }

    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(peakHeight, { duration: 260, easing: Easing.inOut(Easing.ease) }),
          withTiming(minHeight, { duration: 260, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [animated, delay, height, minHeight, peakHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[styles.bar, { width, backgroundColor: color, borderRadius: width / 2 }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    // `height` is driven by the animated style above.
  },
});
