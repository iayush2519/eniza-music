import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '../theme/theme-provider';

export type SliderProps = {
  /** Current value, 0-1. */
  value: number;
  onValueChange: (value: number) => void;
  /** Track thickness in px. Defaults to 4px, matching `ProgressSeekBar`. */
  height?: number;
};

/**
 * A compact, tap/drag-to-set slider — "VolumeSlider" per
 * docs/design/design-system-specification.md's component inventory
 * ("Compact volume control slider"). Shares `ProgressSeekBar`'s visual
 * language (slim track, accent fill, knob) since the approved UI board
 * renders both with the same visual treatment; kept as a separate
 * primitive rather than a variant of `ProgressSeekBar` because a volume
 * slider always accepts input while a progress bar is read-only unless a
 * seek handler is supplied.
 */
export function Slider({ value, onValueChange, height = 4 }: SliderProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const clampedValue = Math.min(1, Math.max(0, value));
  const knobSize = height * 4;

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const updateFromTouch = (event: GestureResponderEvent) => {
    if (trackWidth === 0) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackWidth));
    onValueChange(ratio);
  };

  return (
    <View
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderMove={updateFromTouch}
      onResponderStart={updateFromTouch}
      style={styles.hitArea}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedValue * 100) }}>
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedValue * 100}%`,
              height,
              borderRadius: height / 2,
              backgroundColor: theme.colors.accent,
            },
          ]}
        />
        <View
          style={[
            styles.knob,
            {
              left: `${clampedValue * 100}%`,
              width: knobSize,
              height: knobSize,
              borderRadius: knobSize / 2,
              marginLeft: -knobSize / 2,
              top: height / 2 - knobSize / 2,
              backgroundColor: theme.colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: '100%',
    paddingVertical: 12,
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
