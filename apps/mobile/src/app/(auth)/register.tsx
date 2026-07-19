import { Button, Surface, Text, useTheme, VStack } from '@music-app/design-system';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrandHeader } from '@/components/auth-brand-header';
import { AuthTextField } from '@/components/auth-text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

/** Mirrors the backend's own rule exactly (see
 * apps/api/src/auth/dto/register.dto.ts) so a request that would be
 * rejected server-side is caught before the round-trip, rather than the
 * user only discovering it from a 400 response. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,128}$/;
const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number.';

/**
 * Retheme note: this screen previously used the plain, unstyled
 * `TextField` (a leftover from before `AuthTextField`/`AuthBrandHeader`
 * existed) while Login had already moved to them — a real inconsistency
 * flagged during the Phase 2 audit. Rebuilt here on the same components
 * Login uses, so both auth screens now share one visual/interaction
 * language, per "reuse existing components wherever possible."
 *
 * On success, routes to VerifyOtp (register purpose) rather than
 * straight into the app — registering already returns valid tokens (see
 * AuthService.register), but the approved UI board's Authentication
 * Flow places email verification directly after Register, before the
 * app is considered fully entered.
 */
export default function RegisterScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAnyFieldFocused, setIsAnyFieldFocused] = useState(false);
  const register = useAuthStore((state) => state.register);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const isPasswordValid = PASSWORD_PATTERN.test(password);
  const canSubmit =
    email.length > 0 && displayName.length > 0 && isPasswordValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      // No explicit post-register navigation here — same reasoning as
      // login.tsx's `handleSubmit`. `register()` returns an
      // authenticated-but-unverified profile, and (tabs)/_layout.tsx's
      // own redirect effect is the single source of truth for getting
      // an unverified user to `/verify-otp`; pushing there a second time
      // from this screen raced that effect and was the actual cause of
      // the confirmed empty-email-on-verify-otp bug.
      await register({ email, password, displayName });
    } catch {
      // Error message already in the store, rendered below.
    }
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <AuthBrandHeader tagline="Create your account" isPulsing={!isAnyFieldFocused} />

          <VStack gap="lg">
            <AuthTextField
              label="Display name"
              icon="user"
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => setIsAnyFieldFocused(true)}
              onBlur={() => setIsAnyFieldFocused(false)}
              autoCapitalize="words"
              hasError={Boolean(error)}
              testID="register-display-name-input"
            />
            <AuthTextField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsAnyFieldFocused(true)}
              onBlur={() => setIsAnyFieldFocused(false)}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              hasError={Boolean(error)}
              testID="register-email-input"
            />
            <VStack gap="xs">
              <AuthTextField
                label="Password"
                icon="lock"
                isPassword
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsAnyFieldFocused(true)}
                onBlur={() => setIsAnyFieldFocused(false)}
                autoCapitalize="none"
                hasError={Boolean(error)}
                testID="register-password-input"
              />
              <Text variant="caption" color="textSecondary">
                {PASSWORD_HINT}
              </Text>
            </VStack>

            {error ? (
              <Text color="danger" variant="label" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={isSubmitting}
              style={{ marginTop: theme.spacing.sm }}>
              Create account
            </Button>
          </VStack>

          <SafeAreaView edges={['bottom']} style={{ paddingTop: theme.spacing.xxl }}>
            <Link href="/(auth)/login" asChild>
              <Text variant="label" color="textSecondary" style={styles.centerText}>
                Already have an account? <Text variant="label" color="accent">Sign in</Text>
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
});
