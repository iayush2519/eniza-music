import { Button, Surface, Text, VStack } from '@music-app/design-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrandHeader } from '@/components/auth-brand-header';
import { AuthTextField } from '@/components/auth-text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

/**
 * "Forgot Password" per the approved UI board's Authentication Flow —
 * collects the account email and issues a password-reset OTP. Per
 * AuthService.requestPasswordReset, the backend always responds 204
 * regardless of whether the email has an account (avoiding an
 * account-enumeration leak), so this screen always proceeds to
 * VerifyOtp on success — there is no "no account found" error state to
 * design for.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const canSubmit = email.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await forgotPassword({ email });
      router.push({ pathname: '/(auth)/verify-otp', params: { email, purpose: 'password_reset' } });
    } catch {
      // Error message already in the store, rendered below.
    }
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <AuthBrandHeader tagline="We'll help you get back in" isPulsing={!isEmailFocused} />

          <VStack gap="lg">
            <AuthTextField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              onSubmitEditing={() => void handleSubmit()}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              hasError={Boolean(error)}
              testID="forgot-password-email-input"
            />

            {error ? (
              <Text color="danger" variant="label" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Button onPress={() => void handleSubmit()} disabled={!canSubmit} loading={isSubmitting}>
              Send code
            </Button>
          </VStack>
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
});
