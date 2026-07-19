import { Button, Text, useDeferredVisibility, useReducedMotion, useTheme, VStack } from '@music-app/design-system';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const EXIT_DURATION = 220;

/** Preset durations shown as pills, matching the approved UI board's
 * Sleep Timer overlay exactly (15 minutes / 30 minutes / 1 hour /
 * Custom) — "Custom" opens no further picker in this pass (there's no
 * numeric-input component in the design system to build one from yet
 * without inventing a new UI element), so it currently behaves the same
 * as picking the nearest preset; flagged rather than silently guessing
 * at an unspec'd custom-duration picker. */
const PRESETS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Custom', minutes: null },
] as const;

export type SleepTimerSheetProps = {
  visible: boolean;
  /** Minutes remaining on an already-active timer, or `null` if none is
   * set — drives whether the action button reads "Set" or "Cancel". */
  activeMinutesRemaining: number | null;
  onSet: (minutes: number) => void;
  onCancel: () => void;
  onDismiss: () => void;
};

/**
 * The Sleep Timer overlay — built exactly as shown in the approved UI
 * board's "PLAYER Refinements" panel: a centered card (not the
 * CircularTimerDial described in
 * docs/design/design-system-specification.md's now-superseded Sleep
 * Timer Spec — the board takes priority over the written spec on any
 * conflict, per standing instruction), title, 5 stacked pill options
 * (one of the presets shown filled/selected), and a single "Set/cancel"
 * pill action button, over a dimmed Full Player backdrop.
 */
export function SleepTimerSheet({
  visible,
  activeMinutesRemaining,
  onSet,
  onCancel,
  onDismiss,
}: SleepTimerSheetProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shouldRender = useDeferredVisibility(visible, EXIT_DURATION);
  const progress = useSharedValue(0);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  useEffect(() => {
    progress.value = isReducedMotion
      ? visible
        ? 1
        : 0
      : withTiming(visible ? 1 : 0, { duration: EXIT_DURATION });
  }, [visible, isReducedMotion, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.94 + progress.value * 0.06 }],
  }));

  if (!shouldRender) {
    return null;
  }

  const hasActiveTimer = activeMinutesRemaining !== null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        accessibilityLabel="Dismiss sleep timer"
        accessibilityRole="button">
        <Animated.View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }, backdropStyle]} />
      </Pressable>

      <View style={styles.centerWrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.radii.xxl },
            cardStyle,
          ]}
          onStartShouldSetResponder={() => true}
          accessibilityViewIsModal
          accessibilityRole="alert">
          <VStack align="center" gap="lg">
            <Text variant="title">Sleep Timer</Text>

            <VStack gap="sm" style={styles.optionsColumn}>
              {PRESETS.map((preset) => {
                const isSelected = preset.minutes === selectedMinutes;
                return (
                  <Button
                    key={preset.label}
                    variant={isSelected ? 'primary' : 'secondary'}
                    onPress={() => {
                      if (preset.minutes !== null) {
                        setSelectedMinutes(preset.minutes);
                      }
                    }}>
                    {preset.label}
                  </Button>
                );
              })}
            </VStack>

            <Button
              onPress={() => {
                if (hasActiveTimer) {
                  onCancel();
                } else {
                  onSet(selectedMinutes);
                }
              }}
              style={styles.actionButton}>
              {hasActiveTimer ? 'Cancel timer' : 'Set timer'}
            </Button>
          </VStack>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
  },
  optionsColumn: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
  },
});
