import { Button, Surface, Text, useReducedMotion, useTheme } from '@music-app/design-system';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrandHeader } from '@/components/auth-brand-header';
import { AuthTextField } from '@/components/auth-text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

/**
 * See the approved Login v2 design concept: three vertical zones (brand,
 * form, footer) rather than one centered column, so the eye has a clear
 * path — brand identity first, the task second, the alternative action
 * last and visually de-emphasized. Every animation on this screen maps
 * to a specific state change (entrance, focus, error, submission) per
 * docs/architecture/design-system.md's motion principles — none are
 * decorative-only.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const isReducedMotion = useReducedMotion();

  const isAnyFieldFocused = isEmailFocused || isPasswordFocused;
  const canSubmit = email.length > 0 && password.length > 0 && !isSubmitting;

  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(12);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(12);

  useEffect(() => {
    // Staggered entrance: brand zone first, form zone ~80ms behind — see
    // the design concept's "entrance, not just presence" rule, applied
    // at screen level. Collapses to an instant appearance under reduced
    // motion rather than skipping the stagger but keeping the motion.
    if (isReducedMotion) {
      brandOpacity.value = 1;
      formOpacity.value = 1;
      return;
    }
    const enter = { duration: 250, easing: Easing.out(Easing.cubic) };
    brandOpacity.value = withTiming(1, enter);
    brandTranslateY.value = withTiming(0, enter);
    formOpacity.value = withTiming(1, { ...enter, duration: 330 });
    formTranslateY.value = withTiming(0, { ...enter, duration: 330 });
  }, [isReducedMotion, brandOpacity, brandTranslateY, formOpacity, formTranslateY]);

  const brandAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Errors surface via the store's `error` field, rendered below —
    // intentionally not re-thrown/logged here.
    void login({ email, password });
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={brandAnimatedStyle}>
            <AuthBrandHeader
              tagline="Your sound, right where you left it."
              isPulsing={!isAnyFieldFocused}
            />
          </Animated.View>

          <Animated.View style={[{ gap: theme.spacing.lg }, formAnimatedStyle]}>
            <AuthTextField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              hasError={Boolean(error)}
              testID="login-email-input"
            />
            <AuthTextField
              label="Password"
              icon="lock"
              isPassword
              value={password}
              onChangeText={setPassword}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              autoCapitalize="none"
              hasError={Boolean(error)}
              testID="login-password-input"
            />

            {error ? (
              <Text color="danger" variant="label" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Link href="/(auth)/forgot-password" asChild>
              <Text variant="label" color="accent" style={styles.forgotPassword}>
                Forgot password?
              </Text>
            </Link>

            <Button
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={isSubmitting}
              style={{ marginTop: theme.spacing.sm }}>
              Sign in
            </Button>
          </Animated.View>

          <SafeAreaView edges={['bottom']} style={{ paddingTop: theme.spacing.xxl }}>
            <Link href="/(auth)/register" asChild>
              <Text variant="label" color="textSecondary" style={styles.centerText}>
                Don&apos;t have an account? <Text variant="label" color="accent">Create one</Text>
              </Text>
            </Link>
          </SafeAreaView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 24,
    gap: 32,
  },
  centerText: {
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
});
