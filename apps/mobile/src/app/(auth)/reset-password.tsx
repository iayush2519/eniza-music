import { Button, Surface, Text, VStack } from '@music-app/design-system';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrandHeader } from '@/components/auth-brand-header';
import { AuthTextField } from '@/components/auth-text-field';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

/** Mirrors the backend's own password rule (see
 * apps/api/src/auth/dto/reset-password.dto.ts) so a weak password is
 * caught client-side before the request round-trip, matching Register's
 * existing static hint text. */
const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number.';

/**
 * Final step of the forgot-password flow — sets a new password using the
 * short-lived reset token issued by VerifyOtp's `password_reset` branch.
 * Redirects back to ForgotPassword if reached without a token (e.g. a
 * stale deep link, or the app being killed and reopened mid-flow) — the
 * token is held in memory only (useAuthStore, not persisted), so it
 * genuinely cannot exist here without having just come from VerifyOtp.
 */
export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const resetPasswordFlow = useAuthStore((state) => state.resetPasswordFlow);
  const passwordResetToken = useAuthStore((state) => state.passwordResetToken);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  useEffect(() => {
    if (!passwordResetToken) {
      router.replace('/(auth)/forgot-password');
    }
  }, [passwordResetToken]);

  const canSubmit = newPassword.length >= 8 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await resetPassword(newPassword);
      router.replace({ pathname: '/(auth)/auth-result', params: { outcome: 'password-reset' } });
    } catch {
      // Error already in the store, rendered below. On an expired-token
      // error, resetPasswordFlow() below sends the user back to restart
      // rather than letting them retry against a token that's gone.
      if (!useAuthStore.getState().passwordResetToken) {
        resetPasswordFlow();
        router.replace('/(auth)/forgot-password');
      }
    }
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <AuthBrandHeader tagline="Choose a new password" isPulsing={!isSubmitting} />

          <VStack gap="sm">
            <AuthTextField
              label="New password"
              icon="lock"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
              onSubmitEditing={() => void handleSubmit()}
              autoCapitalize="none"
              hasError={Boolean(error)}
              testID="reset-password-input"
            />
            <Text variant="caption" color="textSecondary">
              {PASSWORD_HINT}
            </Text>

            {error ? (
              <Text color="danger" variant="label" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={isSubmitting}
              style={styles.submitButton}>
              Reset password
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
  submitButton: {
    marginTop: 8,
  },
});
