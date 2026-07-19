import { Text, type ColorRole } from '@music-app/design-system';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';

export type ResendCountdownProps = {
  /** Seconds to count down from — mirrors the backend's own 30s OTP
   * resend cooldown (see apps/api/src/auth/otp/otp.service.ts's
   * `RESEND_COOLDOWN_MS`), so the button never becomes tappable before
   * the server would actually accept the request. */
  seconds?: number;
  onResend: () => void;
  disabled?: boolean;
};

/**
 * "Resend code" as a countdown label that turns into a tappable link
 * once it reaches zero — the standard OTP-screen pattern shown in the
 * approved UI board's "OTP Verification" mockup ("Resend"/"Resend OTP"
 * caption beneath the code boxes). Restarts its own countdown whenever
 * `onResend` is actually invoked (via the `key` reset pattern at the call
 * site — see verify-otp.tsx) rather than owning that reset itself, so a
 * failed resend (network error) doesn't silently restart the timer.
 */
export function ResendCountdown({ seconds = 30, onResend, disabled = false }: ResendCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const canResend = remaining <= 0 && !disabled;
  const color: ColorRole = canResend ? 'accent' : 'textTertiary';

  if (!canResend) {
    return (
      <Text variant="label" color={color} accessibilityLiveRegion="polite">
        Resend code in {remaining}s
      </Text>
    );
  }

  return (
    <Pressable onPress={onResend} accessibilityRole="button" accessibilityLabel="Resend code">
      <Text variant="label" color={color}>
        Resend code
      </Text>
    </Pressable>
  );
}
