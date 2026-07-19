import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type ProgressSeekBarProps = {
  /** Current playback position, 0-1. Callers pass `positionMs / durationMs`. */
  progress: number;
  /** Tap-or-drag-to-seek: called once, with the released position as a
   * 0-1 ratio. Omit for a read-only bar. */
  onSeek?: (ratio: number) => void;
  /** Track thickness in px. Defaults to a slim 4px per the approved UI board. */
  height?: number;
};

/**
 * The slim horizontal track + accent fill + knob used by `MiniPlayer` and
 * the Full Player — "ProgressSeekBar" per
 * docs/design/design-system-specification.md's component inventory
 * ("Music track duration slider and progress visualization... Seekable").
 *
 * Seeking is a single `Gesture.Pan` covering both a tap (a drag with ~0
 * travel) and a real drag-to-scrub, per the premium-player interaction
 * bar (Spotify/Apple Music) this app's own motion principles cite as a
 * quality benchmark — a tap-only bar reads as noticeably less precise
 * once a user tries to drag it, which is the first thing anyone does on
 * a seek bar. `runOnJS(onSeek)` fires once per gesture, on release
 * (`onEnd`), not per-frame during the drag — the knob/fill track the
 * finger continuously via `dragRatio`, a shared value read directly in
 * the animated styles, but the actual native seek only happens once,
 * matching how a physical scrubber commits the seek on release rather
 * than scrubbing the underlying audio live.
 *
 * The fill/knob position animates toward each new `progress` value
 * (rather than snapping instantly) when NOT being dragged, so incoming
 * playback-position updates read as continuous motion instead of a
 * visible jump each time the store re-renders this component; while a
 * drag is active, `dragRatio` overrides that entirely so the knob always
 * tracks the finger exactly, never fighting the incoming position
 * updates mid-gesture.
 */
export function ProgressSeekBar({ progress, onSeek, height = 4 }: ProgressSeekBarProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const knobSize = height * 3;
  const animatedProgress = useSharedValue(clampedProgress);
  const trackWidth = useSharedValue(0);
  // `null` while not dragging — the animated styles below fall back to
  // `animatedProgress` in that case. Set on gesture start, cleared on
  // end, so a drag always wins over any in-flight `progress` update.
  const dragRatio = useSharedValue<number | null>(null);

  useEffect(() => {
    animatedProgress.value = isReducedMotion
      ? clampedProgress
      : withTiming(clampedProgress, { duration: duration.base, easing: easing.linear });
  }, [clampedProgress, isReducedMotion, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(dragRatio.value ?? animatedProgress.value) * 100}%`,
  }));
  const knobStyle = useAnimatedStyle(() => ({
    left: `${(dragRatio.value ?? animatedProgress.value) * 100}%`,
    transform: [{ scale: dragRatio.value !== null ? 1.3 : 1 }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  };

  const ratioFromX = (x: number) => {
    'worklet';
    if (trackWidth.value === 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, x / trackWidth.value));
  };

  const pan = Gesture.Pan()
    .enabled(Boolean(onSeek))
    .onBegin((event) => {
      dragRatio.value = ratioFromX(event.x);
    })
    .onUpdate((event) => {
      dragRatio.value = ratioFromX(event.x);
    })
    .onEnd((event) => {
      const ratio = ratioFromX(event.x);
      dragRatio.value = null;
      if (onSeek) {
        runOnJS(onSeek)(ratio);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={handleLayout}
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
      </View>
    </GestureDetector>
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
