import { useReducedMotion, useTheme } from '@music-app/design-system';
import { forwardRef, useEffect, useState } from 'react';
import { Animated as RNAnimated, StyleSheet, TextInput, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export type OtpInputProps = {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Shakes the boxes and tints them `danger` — mirrors
   * `AuthTextField`'s `hasError` shake convention exactly, so an OTP
   * mistake reads the same way a login-field mistake does. */
  hasError?: boolean;
  onSubmitEditing?: () => void;
  testID?: string;
};

/**
 * A row of single-digit boxes for OTP entry — "OTP Verification" per the
 * approved UI board. The board's own mockup shows 4 boxes with lorem-
 * ipsum/placeholder text throughout every screen (a generic template, not
 * bespoke ENIZA copy), while the already-shipped, tested backend
 * (AuthService/OtpService, apps/api/src/auth) issues 6-digit codes — a
 * more conventional, more secure length. `length` defaults to 6 to match
 * the real backend contract; it's a prop specifically so this is a
 * one-line change if a shorter code is later confirmed as the intended
 * design, rather than a hardcoded assumption baked into the component.
 *
 * Built on one hidden `TextInput` (not N separate inputs) — this is what
 * makes "paste support" trivial: the OS paste menu naturally targets the
 * single focused input, and its `onChangeText` receives the full pasted
 * string in one call. Rendering N boxes from that one string is simpler
 * and more robust than coordinating focus-advance across N separate
 * inputs on every keystroke AND handling a multi-character paste landing
 * on one of them.
 */
export const OtpInput = forwardRef<TextInput, OtpInputProps>(function OtpInput(
  { length = 6, value, onChangeText, hasError = false, onSubmitEditing, testID },
  ref,
) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shakeOffset = useSharedValue(0);
  // `useState` (not `useRef(...).current`) for a stable instance — a ref
  // read directly during render trips the React Compiler's "no ref
  // access during render" rule, even for a one-time lazy-init pattern;
  // `useState`'s lazy initializer runs exactly once per mount and is
  // designed to be read during render.
  const [cursorOpacity] = useState(() => new RNAnimated.Value(1));

  useAnimatedShake(hasError, shakeOffset, isReducedMotion);
  useBlinkingCursor(cursorOpacity, isReducedMotion);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const digits = Array.from({ length }, (_, index) => value[index] ?? '');
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Reanimated.View style={containerAnimatedStyle}>
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const isActive = index === activeIndex && value.length < length;
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  borderRadius: theme.radii.lg,
                  borderColor: hasError
                    ? theme.colors.danger
                    : isActive
                      ? theme.colors.accent
                      : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}>
              {digit ? (
                <View style={styles.digitWrapper}>
                  <RNAnimated.Text
                    style={[
                      styles.digitText,
                      { color: hasError ? theme.colors.danger : theme.colors.text },
                    ]}>
                    {digit}
                  </RNAnimated.Text>
                </View>
              ) : isActive ? (
                <RNAnimated.View
                  style={[styles.cursor, { backgroundColor: theme.colors.accent, opacity: cursorOpacity }]}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {/* The single real input: invisible, positioned over the boxes, so
          tapping anywhere in the row focuses it — autoFocus gets the
          keyboard (and paste target) up immediately on screen entry,
          satisfying "auto-focus OTP inputs" without a manual `useEffect`
          + `.focus()` call. */}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        onSubmitEditing={onSubmitEditing}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={length}
        style={styles.hiddenInput}
        testID={testID}
        accessibilityLabel="Verification code"
      />
    </Reanimated.View>
  );
});

function useAnimatedShake(
  hasError: boolean,
  shakeOffset: ReturnType<typeof useSharedValue<number>>,
  isReducedMotion: boolean,
) {
  // Effect (not render-body logic) reacting only to `hasError`'s
  // identity change — mirrors `AuthTextField`'s own `useErrorShake`
  // exactly, including the same "don't re-shake on every unrelated
  // re-render while the error is already showing" rationale.
  useEffect(() => {
    if (hasError && !isReducedMotion) {
      // eslint-disable-next-line react-hooks/immutability -- shared value driving an imperative animation, not render state
      shakeOffset.value = withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 80 }),
        withTiming(0, { duration: 60 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError]);
}

function useBlinkingCursor(cursorOpacity: RNAnimated.Value, isReducedMotion: boolean) {
  useEffect(() => {
    if (isReducedMotion) {
      return undefined;
    }
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        RNAnimated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cursorOpacity, isReducedMotion]);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '600',
  },
  cursor: {
    width: 2,
    height: 24,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
});
