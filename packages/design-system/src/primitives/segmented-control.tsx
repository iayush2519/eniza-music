import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from './text';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type SegmentedControlProps<T extends string> = {
  segments: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A single-select, pill-shaped multi-option control — "SegmentedControl"
 * per docs/design/design-system-specification.md's component inventory
 * ("Multi-select view, e.g. Playlists/Albums/Artists"). Used on Library
 * to switch between playlist/album/artist lists, and (later) Settings'
 * data-usage toggle.
 *
 * The active segment's background cross-fades between segments rather
 * than snapping instantly — Phase 2's version toggled `backgroundColor`
 * with no transition at all, which read as an abrupt flash rather than a
 * deliberate selection change.
 */
export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();

  return (
    <View
      style={[styles.track, { backgroundColor: theme.colors.surfacePressed, borderRadius: theme.radii.full }]}
      accessibilityRole="tablist">
      {segments.map((segment) => (
        <Segment
          key={segment}
          label={segment}
          isActive={segment === value}
          onPress={() => onChange(segment)}
          isReducedMotion={isReducedMotion}
        />
      ))}
    </View>
  );
}

function Segment({
  label,
  isActive,
  onPress,
  isReducedMotion,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  isReducedMotion: boolean;
}) {
  const theme = useTheme();
  const activeProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = isReducedMotion
      ? (isActive ? 1 : 0)
      : withTiming(isActive ? 1 : 0, { duration: duration.base, easing: easing.standard });
  }, [isActive, isReducedMotion, activeProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={styles.segment}>
      <Animated.View
        style={[
          styles.activeBackground,
          { borderRadius: theme.radii.full, backgroundColor: theme.colors.background },
          animatedStyle,
        ]}
      />
      <Text variant="caption" color={isActive ? 'text' : 'textSecondary'} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBackground: {
    ...StyleSheet.absoluteFill,
  },
  label: {
    zIndex: 1,
  },
});
