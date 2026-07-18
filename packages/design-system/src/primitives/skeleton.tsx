import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { RadiusToken } from '../tokens/radii';

export type SkeletonProps = {
  width: number | `${number}%`;
  height: number;
  radius?: RadiusToken;
  style?: ViewStyle;
};

/**
 * A pulsing placeholder rectangle — "SkeletonLoader", required by
 * docs/design/design-system-specification.md's state-management table
 * for every loading list/card/detail view. A single generic primitive
 * (not separate Header/List/Card/Detail components) composes into any of
 * those shapes from the call site, the same way `Surface` composes into
 * cards/rows rather than each needing its own component.
 *
 * Pulses opacity continuously; reduced-motion renders a static
 * mid-opacity fill instead, per the design system's accessibility rules.
 */
export function Skeleton({ width, height, radius = 'sm', style }: SkeletonProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(isReducedMotion ? 0.6 : 0.4);

  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [isReducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: theme.radii[radius], backgroundColor: theme.colors.border },
        animatedStyle,
        style,
      ]}
      accessibilityElementsHidden
    />
  );
}

export type SkeletonRowProps = { style?: ViewStyle };

/** A preset skeleton matching `TrackRow`/`PlaylistCard`'s shape (artwork
 * thumbnail + two lines of text) — the most common loading shape in the
 * app's lists. */
export function SkeletonRow({ style }: SkeletonRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={48} height={48} radius="sm" />
      <View style={styles.rowLines}>
        <Skeleton width="60%" height={16} radius="sm" />
        <Skeleton width="40%" height={12} radius="sm" style={styles.rowLineGap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  rowLines: {
    flex: 1,
  },
  rowLineGap: {
    marginTop: 8,
  },
});
