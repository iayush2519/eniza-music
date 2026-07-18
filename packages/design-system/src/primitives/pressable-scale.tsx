import { ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { duration, easing, spring } from '../tokens/motion';

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  /** Scale factor while pressed. Defaults to 0.96, matching `Button`. */
  scaleTo?: number;
  /** Opacity while pressed. Defaults to 0.85 — a subtle dim, matching the
   * press feedback of cards in mature, polished music-app UIs, layered on
   * top of the scale so a press reads as "responsive" even when the
   * scale change alone is hard to notice on a large card. */
  opacityTo?: number;
  style?: ViewStyle | ViewStyle[];
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The shared press-feedback wrapper every tappable card/row/chip in the
 * app should use — generalizes the scale-down-on-press animation
 * `Button`/`IconButton` already implemented independently in Phase 2, so
 * every tappable surface (not just buttons) gets the same "compresses
 * slightly, dims, springs back" feel instead of some components pressing
 * and others not reacting at all. Respects `useReducedMotion()` the same
 * way `Button` does — reduced motion snaps directly to the pressed/rest
 * values with no animation, and never dims (opacity changes can be
 * disorienting without the scale motion that normally contextualizes
 * them).
 */
export function PressableScale({
  children,
  scaleTo = 0.96,
  opacityTo = 0.85,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          // eslint-disable-next-line react-hooks/immutability
          scale.value = isReducedMotion
            ? scaleTo
            : withTiming(scaleTo, { duration: duration.fast, easing: easing.standard });
          // eslint-disable-next-line react-hooks/immutability
          opacity.value = isReducedMotion
            ? 1
            : withTiming(opacityTo, { duration: duration.fast, easing: easing.standard });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = isReducedMotion ? 1 : withSpring(1, spring.standard);
        // eslint-disable-next-line react-hooks/immutability
        opacity.value = isReducedMotion ? 1 : withTiming(1, { duration: duration.base, easing: easing.standard });
        onPressOut?.(event);
      }}
      style={[animatedStyle, style]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}

// Deliberately no automatic disabled-opacity styling here (unlike
// `Button`'s `disabled` prop): every current call site passes
// `disabled={!onPress}` to mean "this card/row has no action, render it
// statically" (e.g. a `TrackRow` with no playback handler), not "this
// action is temporarily unavailable." Fading those would visually change
// every non-interactive card in the app for a semantic that was never
// asked for — a `Button`-style disabled state can be added later behind
// its own explicit prop if a real disabled *action* (not just an absent
// one) needs it.
