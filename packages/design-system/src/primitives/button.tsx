import { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './text';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Disables interaction and renders at reduced opacity. */
  disabled?: boolean;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The app's only tappable-button primitive. Every variant shares the same
 * press-feedback animation (a subtle scale-down via Reanimated) so every
 * interactive control in the app feels consistent — this is one of the
 * concrete, structural ways the product goal of "motion as a first-class
 * part of the UI, not decoration bolted on" gets enforced rather than left
 * to each screen's discretion.
 */
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle = getVariantStyle(variant, theme);

  return (
    <AnimatedPressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
      onPressIn={(event) => {
        // react-hooks/immutability doesn't recognize Reanimated's
        // SharedValue.value as an intentionally mutable ref (a documented
        // upstream gap: facebook/react#29641). This assignment is the
        // correct, library-sanctioned way to drive a shared value.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.96, { duration: duration.fast, easing: easing.standard });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: duration.base, easing: easing.standard });
        onPressOut?.(event);
      }}
      style={[
        styles.base,
        { backgroundColor: variantStyle.backgroundColor, borderRadius: theme.radii.md },
        disabled && styles.disabled,
        animatedStyle,
        rest.style,
      ]}
      {...rest}>
      <Text variant="bodyStrong" color={variantStyle.textColor}>
        {children}
      </Text>
    </AnimatedPressable>
  );
}

function getVariantStyle(variant: ButtonVariant, theme: ReturnType<typeof useTheme>) {
  switch (variant) {
    case 'primary':
      return { backgroundColor: theme.colors.accent, textColor: 'textOnAccent' as const };
    case 'secondary':
      return { backgroundColor: theme.colors.surface, textColor: 'text' as const };
    case 'ghost':
      return { backgroundColor: 'transparent', textColor: 'accent' as const };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
