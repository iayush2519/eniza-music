import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from './button';
import { HStack, VStack } from './stack';
import { Text } from './text';
import { useDeferredVisibility } from '../theme/use-deferred-visibility';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders `confirmLabel` in `danger` styling — for destructive actions
   * like deleting a playlist. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const EXIT_DURATION = duration.base;

/**
 * A centered modal for confirming a critical action — "ConfirmDialog" per
 * docs/design/design-system-specification.md's component inventory
 * ("Confirmation modal for critical actions (Delete)... Settings,
 * Delete"). Built on React Native's built-in `Modal` (no new dependency
 * needed) with a `theme.colors.overlay` scrim, matching the approved UI
 * board's dialog treatment.
 *
 * The card fades and scales in/out using the design system's own motion
 * tokens rather than `Modal`'s built-in `animationType`, whose fixed,
 * un-themeable timing/curve was the one animated surface in Phase 2 that
 * didn't share the app's motion language. `useDeferredVisibility` keeps
 * the `Modal` mounted long enough for the exit animation to actually
 * play before it unmounts.
 */
export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shouldRender = useDeferredVisibility(visible, EXIT_DURATION);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = isReducedMotion
      ? (visible ? 1 : 0)
      : withTiming(visible ? 1 : 0, { duration: EXIT_DURATION, easing: easing.standard });
  }, [visible, isReducedMotion, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }, backdropStyle]}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.radii.xxl },
            cardStyle,
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert">
          <VStack gap="sm">
            <Text variant="title">{title}</Text>
            {description ? (
              <Text variant="label" color="textSecondary">
                {description}
              </Text>
            ) : null}
          </VStack>
          <HStack gap="sm" style={styles.actions}>
            <View style={styles.actionFlex}>
              <Button variant="secondary" onPress={onCancel}>
                {cancelLabel}
              </Button>
            </View>
            <View style={styles.actionFlex}>
              <Button
                variant="primary"
                onPress={onConfirm}
                style={destructive ? { backgroundColor: theme.colors.danger } : undefined}>
                {confirmLabel}
              </Button>
            </View>
          </HStack>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    gap: 24,
  },
  actions: {
    justifyContent: 'space-between',
  },
  actionFlex: {
    flex: 1,
  },
});
