import { Button, Surface, Text, VStack } from '@music-app/design-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrandHeader } from '@/components/auth-brand-header';
import { OtpInput } from '@/components/otp-input';
import { ResendCountdown } from '@/components/resend-countdown';
import { MaxContentWidth } from '@/constants/layout';
import { useAuthStore } from '@/stores/auth-store';

const OTP_LENGTH = 6;

/**
 * "OTP Verification" per the approved UI board — entered via two flows,
 * distinguished by the `purpose` param:
 *
 * - `register`: reached right after Register. Success returns the
 *   updated (now-verified) profile and this screen pushes to the
 *   "Account Verified" success screen.
 * - `password_reset`: reached from ForgotPassword. Success stores a
 *   reset token in `useAuthStore` and this screen pushes to
 *   ResetPassword instead.
 *
 * One screen for both rather than two near-duplicates, since the only
 * difference is which store action to call and where to navigate next —
 * the actual OTP entry UI (boxes, countdown, resend, error shake) is
 * identical.
 */
export default function VerifyOtpScreen() {
  const { email, purpose } = useLocalSearchParams<{
    email: string;
    purpose: 'register' | 'password_reset';
  }>();
  const [code, setCode] = useState('');
  const [resendKey, setResendKey] = useState(0);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const verifyPasswordResetOtp = useAuthStore((state) => state.verifyPasswordResetOtp);
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const canSubmit = code.length === OTP_LENGTH && !isSubmitting;

  const handleVerify = async () => {
    if (!canSubmit) return;
    try {
      if (purpose === 'password_reset') {
        await verifyPasswordResetOtp({ email, code });
        router.push('/(auth)/reset-password');
      } else {
        await verifyOtp({ email, code });
        router.push({ pathname: '/auth-result', params: { outcome: 'verified' } });
      }
    } catch {
      // Error message is already in the store and rendered below;
      // clear the entered code so the user isn't left staring at a
      // code that's now known to be wrong.
      setCode('');
    }
  };

  const handleResend = async () => {
    setResendKey((key) => key + 1);
    try {
      if (purpose === 'password_reset') {
        await forgotPassword({ email });
      } else {
        await resendOtp({ email });
      }
    } catch {
      // toErrorMessage already populated `error`; nothing further to do
      // here besides letting ResendCountdown's own re-render show it.
    }
  };

  return (
    <Surface style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <AuthBrandHeader tagline="Enter the code we sent you" isPulsing={!isSubmitting} />

          <VStack align="center" gap="lg">
            <Text variant="body" color="textSecondary" style={styles.centerText}>
              We sent a 6-digit code to{'\n'}
              <Text variant="bodyStrong">{email}</Text>
            </Text>

            <OtpInput
              length={OTP_LENGTH}
              value={code}
              onChangeText={setCode}
              hasError={Boolean(error)}
              onSubmitEditing={() => void handleVerify()}
              testID="verify-otp-input"
            />

            {error ? (
              <Text color="danger" variant="label" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <ResendCountdown key={resendKey} onResend={() => void handleResend()} />

            <Button onPress={() => void handleVerify()} disabled={!canSubmit} loading={isSubmitting}>
              Verify
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
    gap: 40,
  },
  centerText: {
    textAlign: 'center',
  },
});
