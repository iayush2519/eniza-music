import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from './icon';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { ColorRole } from '../tokens/colors';
import { IconSizeToken } from '../tokens/sizes';
import { duration, easing, spring } from '../tokens/motion';

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  name: IconName;
  size?: IconSizeToken;
  color?: ColorRole;
  /** `ghost` (no fill, default) or `filled` (tinted circular background). */
  variant?: 'ghost' | 'filled';
  accessibilityLabel: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A compact, icon-only tappable control ("IconButton", per
 * docs/design/design-system-specification.md's component inventory —
 * "Compact icon-only action"). Shares `Button`'s press-scale feedback so
 * every tappable control in the app compresses the same way on touch.
 */
export function IconButton({
  name,
  size = 'md',
  color = 'text',
  variant = 'ghost',
  accessibilityLabel,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = isReducedMotion
          ? 0.9
          : withTiming(0.9, { duration: duration.fast, easing: easing.standard });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = isReducedMotion ? 1 : withSpring(1, spring.standard);
        onPressOut?.(event);
      }}
      style={[
        styles.base,
        {
          borderRadius: theme.radii.full,
          backgroundColor: variant === 'filled' ? theme.colors.surface : 'transparent',
        },
        animatedStyle,
      ]}
      {...rest}>
      <Icon name={name} size={size} color={color} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
