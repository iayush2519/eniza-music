import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type ProgressSeekBarProps = {
  /** Current playback position, 0-1. Callers pass `positionMs / durationMs`. */
  progress: number;
  /** Tap-to-seek: called with the tapped position as a 0-1 ratio. Omit for a read-only bar. */
  onSeek?: (ratio: number) => void;
  /** Track thickness in px. Defaults to a slim 4px per the approved UI board. */
  height?: number;
};

/**
 * The slim horizontal track + accent fill + knob used by `MiniPlayer` and
 * (later) the Full Player — "ProgressSeekBar" per
 * docs/design/design-system-specification.md's component inventory
 * ("Music track duration slider and progress visualization... Seekable").
 *
 * Seeking is tap-to-position rather than drag — a full drag gesture needs
 * `react-native-gesture-handler`'s pan gesture, which is now available
 * app-wide via the root `GestureHandlerRootView`; not added here since no
 * caller yet needs the extra precision drag gives over tap-to-position.
 * The fill/knob position animates toward each new `progress` value
 * (rather than snapping instantly) so incoming playback-position updates
 * read as continuous motion instead of a visible jump each time the
 * store re-renders this component.
 */
export function ProgressSeekBar({ progress, onSeek, height = 4 }: ProgressSeekBarProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const knobSize = height * 3;
  const animatedProgress = useSharedValue(clampedProgress);

  useEffect(() => {
    animatedProgress.value = isReducedMotion
      ? clampedProgress
      : withTiming(clampedProgress, { duration: duration.base, easing: easing.linear });
  }, [clampedProgress, isReducedMotion, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${animatedProgress.value * 100}%` }));
  const knobStyle = useAnimatedStyle(() => ({ left: `${animatedProgress.value * 100}%` }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (!onSeek || trackWidth === 0) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackWidth));
    onSeek(ratio);
  };

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handlePress}
      disabled={!onSeek}
      accessibilityRole={onSeek ? 'adjustable' : undefined}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedProgress * 100) }}
      style={[styles.hitArea, { paddingVertical: onSeek ? 12 : 0 }]}>
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: theme.colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            { height, borderRadius: height / 2, backgroundColor: theme.colors.accent },
            fillStyle,
          ]}
        />
        {onSeek ? (
          <Animated.View
            style={[
              styles.knob,
              {
                width: knobSize,
                height: knobSize,
                borderRadius: knobSize / 2,
                marginLeft: -knobSize / 2,
                top: height / 2 - knobSize / 2,
                backgroundColor: theme.colors.accent,
              },
              knobStyle,
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  knob: {
    position: 'absolute',
  },
});
