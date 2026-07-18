import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { useDeferredVisibility } from '../theme/use-deferred-visibility';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration as durationTokens, spring } from '../tokens/motion';

export type ToastVariant = 'success' | 'error';

export type ToastProps = {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 2600ms. */
  duration?: number;
};

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: 'check-circle',
  error: 'alert-circle',
};

const EXIT_DURATION = durationTokens.base;

/**
 * A brief, self-dismissing top-anchored notification — "ErrorToast" per
 * docs/design/design-system-specification.md's component inventory
 * ("Brief success/error message notification... Red Text, Success
 * Text"). Controlled (`visible`/`onDismiss`), not a global imperative
 * manager — no toast-queue/portal architecture exists anywhere in the
 * app yet, and introducing one is a bigger decision than this component
 * should make unilaterally; a screen renders one `Toast` and owns its own
 * visibility state, the same pattern `AuthTextField`'s `hasError` already
 * uses for inline errors.
 *
 * Phase 2's version returned `null` the instant `visible` went `false`,
 * which meant the exit animation coded below it never actually ran — the
 * component unmounted before Reanimated could render a single frame of
 * it. `useDeferredVisibility` (shared with `ConfirmDialog`/`ContextMenu`)
 * fixes that by keeping the toast mounted for exactly as long as its own
 * exit animation takes.
 */
export function Toast({ visible, message, variant = 'success', onDismiss, duration = 2600 }: ToastProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shouldRender = useDeferredVisibility(visible, EXIT_DURATION);
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = isReducedMotion ? 0 : withSpring(0, spring.standard);
      opacity.value = isReducedMotion ? 1 : withTiming(1, { duration: durationTokens.fast });

      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }

    translateY.value = isReducedMotion ? -80 : withTiming(-80, { duration: EXIT_DURATION });
    opacity.value = isReducedMotion ? 0 : withTiming(0, { duration: EXIT_DURATION });
    return undefined;
  }, [visible, duration, onDismiss, translateY, opacity, isReducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!shouldRender) {
    return null;
  }

  const iconColor = variant === 'success' ? 'success' : 'danger';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderRadius: theme.radii.lg,
            borderColor: theme.colors.border,
          },
          animatedStyle,
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite">
        <Icon name={VARIANT_ICON[variant]} size="sm" color={iconColor} />
        <Text variant="label" style={styles.message}>
          {message}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    maxWidth: '92%',
  },
  message: {
    flexShrink: 1,
  },
});
