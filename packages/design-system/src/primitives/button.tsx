import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EqualizerGlyph } from './equalizer-glyph';
import { Text } from './text';
import { HStack } from './stack';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { elevation } from '../tokens/elevation';
import { duration, easing, spring } from '../tokens/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Disables interaction and renders at reduced opacity. */
  disabled?: boolean;
  /**
   * Shows the animated equalizer glyph beside the label and implicitly
   * disables interaction. The same glyph used as the app's quiet brand
   * motif at rest becomes a functional loading indicator here — one
   * asset, two jobs — rather than a generic spinner icon.
   */
  loading?: boolean;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The app's only tappable-button primitive. Every variant shares the same
 * press-feedback animation so every interactive control in the app feels
 * consistent — this is one of the concrete, structural ways the product
 * goal of "motion as a first-class part of the UI, not decoration bolted
 * on" gets enforced rather than left to each screen's discretion.
 *
 * The `primary` variant additionally floats at rest (`elevation.floating`)
 * and compresses toward the surface on press — the shadow shrinks in
 * lockstep with the scale-down, then springs back on release rather than
 * easing back linearly, so it reads as a physical object settling rather
 * than a mechanical stop. `secondary`/`ghost` skip the shadow treatment:
 * a ghost button has no background to cast a shadow against, and a
 * secondary button is deliberately lower-emphasis than primary, which a
 * floating shadow would undercut.
 */
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  // 0 = at rest (floating), 1 = pressed (compressed toward the surface).
  const pressProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowScale = interpolate(pressProgress.value, [0, 1], [1, 0.4]);
    return {
      transform: [{ scale: scale.value }],
      ...(variant === 'primary' && Platform.OS === 'ios'
        ? {
            shadowOpacity: elevation.floating.shadowOpacity * shadowScale,
            shadowRadius: elevation.floating.shadowRadius * shadowScale,
          }
        : {}),
    };
  });

  const variantStyle = getVariantStyle(variant, theme);
  const isFloating = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      disabled={isDisabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPressIn={(event) => {
        // react-hooks/immutability doesn't recognize Reanimated's
        // SharedValue.value as an intentionally mutable ref (a documented
        // upstream gap: facebook/react#29641). This assignment is the
        // correct, library-sanctioned way to drive a shared value.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = isReducedMotion
          ? 0.96
          : withTiming(0.96, { duration: duration.fast, easing: easing.standard });
        // eslint-disable-next-line react-hooks/immutability
        pressProgress.value = isReducedMotion ? 1 : withTiming(1, { duration: duration.fast });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = isReducedMotion ? 1 : withSpring(1, spring.standard);
        // eslint-disable-next-line react-hooks/immutability
        pressProgress.value = isReducedMotion ? 0 : withSpring(0, spring.standard);
        onPressOut?.(event);
      }}
      style={[
        styles.base,
        { backgroundColor: variantStyle.backgroundColor, borderRadius: theme.radii.md },
        isFloating &&
          (Platform.OS === 'android'
            ? { elevation: elevation.floating.androidElevation }
            : {
                shadowColor: theme.colors.text,
                shadowOffset: { width: 0, height: elevation.floating.shadowOffsetHeight },
              }),
        disabled && styles.disabled,
        animatedStyle,
        rest.style,
      ]}
      {...rest}>
      <HStack gap="sm" align="center">
        {loading ? <EqualizerGlyph color={variantStyle.textColor} animated size={14} /> : null}
        <Text variant="bodyStrong" color={variantStyle.textColor}>
          {children}
        </Text>
      </HStack>
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
