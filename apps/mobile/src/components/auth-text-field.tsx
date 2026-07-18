import { Icon, useReducedMotion, useTheme, type IconName } from '@music-app/design-system';
import { forwardRef, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type AuthTextFieldProps = Omit<TextInputProps, 'placeholder'> & {
  /** Field label. Doubles as the resting placeholder and the floating
   * label once focused or filled — see the animation notes below. */
  label: string;
  /** Leading icon, tinted `textTertiary` at rest and `accent` on focus. */
  icon: IconName;
  /** Renders a show/hide toggle and masks input when hidden. Mutually
   * exclusive with `secureTextEntry` — this component owns that state
   * itself so the toggle and the mask never drift out of sync. */
  isPassword?: boolean;
  /** External validation error. Turns the border/label `danger` and
   * triggers a single shake — see the Login v2 design concept. Pass the
   * error message itself (or any truthy/falsy value); a change from
   * falsy to truthy is what triggers the shake, not repeated identical
   * error values. */
  hasError?: boolean;
};

const SPRING_CONFIG = { damping: 18, stiffness: 180, mass: 1 };

/**
 * The shared text input for auth screens (Login, Register), replacing
 * the placeholder-only `TextField`. A floating label keeps the field's
 * identity visible at all times — including to screen readers, which
 * never lose it the way they would a placeholder-only field — while
 * still looking like a placeholder at rest. See the approved Login v2
 * design concept for the full rationale.
 */
export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  { label, icon, isPassword = false, hasError = false, onFocus, onBlur, value, secureTextEntry, ...rest },
  ref,
) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const focusProgress = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const shakeOffset = useSharedValue(0);
  const isLabelFloated = isFocused || (typeof value === 'string' && value.length > 0);
  const labelFloatProgress = useSharedValue(isLabelFloated ? 1 : 0);

  useEffect(() => {
    labelFloatProgress.value = isReducedMotion
      ? (isLabelFloated ? 1 : 0)
      : withTiming(isLabelFloated ? 1 : 0, { duration: 180 });
  }, [isLabelFloated, isReducedMotion, labelFloatProgress]);

  useErrorShake(hasError, shakeOffset, isReducedMotion);

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setIsFocused(true);
    focusProgress.value = isReducedMotion ? 1 : withSpring(1, SPRING_CONFIG);
    iconScale.value = isReducedMotion ? 1.08 : withTiming(1.08, { duration: 120 });
    onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setIsFocused(false);
    focusProgress.value = isReducedMotion ? 0 : withSpring(0, SPRING_CONFIG);
    iconScale.value = isReducedMotion ? 1 : withTiming(1, { duration: 120 });
    onBlur?.(event);
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? theme.colors.danger
      : interpolateColor(focusProgress.value, [0, 1], [theme.colors.border, theme.colors.accent]),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [theme.colors.surface, theme.colors.backgroundElevated],
    ),
    transform: [{ translateX: shakeOffset.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    top: 12 - labelFloatProgress.value * 10,
    fontSize: theme.typeScale.body.fontSize - labelFloatProgress.value * 2,
    color: hasError
      ? theme.colors.danger
      : interpolateColor(focusProgress.value, [0, 1], [theme.colors.textTertiary, theme.colors.accent]),
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    marginTop: labelFloatProgress.value * 14,
  }));

  const iconColorRole = hasError ? 'danger' : isFocused ? 'accent' : 'textTertiary';

  return (
    <Animated.View
      style={[styles.container, { borderRadius: theme.radii.md }, containerAnimatedStyle]}>
      <Animated.View style={iconAnimatedStyle}>
        <Icon name={icon} size="sm" color={iconColorRole} />
      </Animated.View>

      <View style={styles.inputColumn}>
        <Animated.Text pointerEvents="none" style={[styles.label, labelAnimatedStyle]}>
          {label}
        </Animated.Text>
        <Animated.View style={inputAnimatedStyle}>
          <TextInput
            ref={ref}
            value={value}
            secureTextEntry={isPassword ? !isPasswordVisible : secureTextEntry}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.input, { color: theme.colors.text, fontSize: theme.typeScale.body.fontSize }]}
            {...rest}
          />
        </Animated.View>
      </View>

      {isPassword ? (
        <Pressable
          onPress={() => setIsPasswordVisible((visible) => !visible)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}>
          <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} size="sm" color="textTertiary" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
});

/**
 * Triggers a single horizontal shake whenever `hasError` transitions from
 * false to true (not on every render while it stays true). Reduced motion
 * skips the shake entirely — the border/label already turning `danger`
 * color (in `containerAnimatedStyle`/`labelAnimatedStyle` above) conveys
 * the error state without relying on motion, per the design system's
 * accessibility rules.
 */
function useErrorShake(
  hasError: boolean,
  shakeOffset: ReturnType<typeof useSharedValue<number>>,
  isReducedMotion: boolean,
) {
  useEffect(() => {
    if (hasError && !isReducedMotion) {
      // eslint-disable-next-line react-hooks/immutability -- `shakeOffset` is a passed-in SharedValue, not a locally-created one
      shakeOffset.value = withSequence(
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 80 }),
        withTiming(0, { duration: 60 }),
      );
    }
    // Deliberately reacting only to `hasError`'s identity — re-shaking on
    // every parent re-render while an error is already showing would be
    // noisy and wouldn't correspond to a new mistake being made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError]);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderWidth: 1.5,
  },
  inputColumn: {
    flex: 1,
  },
  label: {
    position: 'absolute',
    left: 0,
  },
  input: {
    padding: 0,
    includeFontPadding: false,
  },
});
