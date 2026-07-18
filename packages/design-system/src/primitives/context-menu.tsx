import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { HStack } from './stack';
import { Text } from './text';
import { useDeferredVisibility } from '../theme/use-deferred-visibility';
import { useReducedMotion } from '../theme/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import { duration, easing } from '../tokens/motion';

export type ContextMenuItem = {
  key: string;
  label: string;
  icon: IconName;
  /** Renders the label/icon in `danger` styling — for destructive items
   * like "Remove from playlist". */
  destructive?: boolean;
  onPress: () => void;
};

export type ContextMenuProps = {
  visible: boolean;
  items: readonly ContextMenuItem[];
  onDismiss: () => void;
};

const EXIT_DURATION = duration.base;
const SHEET_TRAVEL = 40;

/**
 * A bottom-sheet-style action list — "ContextContextMenu" per
 * docs/design/design-system-specification.md's component inventory
 * ("Dropdown menu for additional actions (songs, albums)... Bottom
 * Sheet, Dialog... Full Player, Song Lists"), matching the "Context
 * Menus" list-of-rows layout shown in the approved UI board's Visual
 * Component Library.
 *
 * Built on React Native's built-in `Modal` — a true draggable bottom
 * sheet (drag-to-dismiss, snap points) is a natural next step now that
 * `GestureHandlerRootView` is wired at the app root, but isn't added here
 * since no screen yet needs a snap-point/drag-velocity interaction beyond
 * open/dismiss; the slide+fade below (using the app's own motion tokens,
 * not `Modal`'s fixed built-in `animationType`) covers a smooth open/
 * close, and `useDeferredVisibility` keeps the sheet mounted long enough
 * for the close animation to actually play. Tap-the-backdrop-to-dismiss
 * still covers the "dismiss" interaction.
 */
export function ContextMenu({ visible, items, onDismiss }: ContextMenuProps) {
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
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SHEET_TRAVEL }],
    opacity: progress.value,
  }));

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        accessibilityLabel="Dismiss menu"
        accessibilityRole="button">
        <Animated.View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }, backdropStyle]} />
      </Pressable>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderTopLeftRadius: theme.radii.xxl,
            borderTopRightRadius: theme.radii.xxl,
          },
          sheetStyle,
        ]}
        onStartShouldSetResponder={() => true}
        accessibilityViewIsModal>
        <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
        {items.map((item) => (
          <PressableScale
            key={item.key}
            scaleTo={0.98}
            opacityTo={0.6}
            onPress={() => {
              onDismiss();
              item.onPress();
            }}
            accessibilityRole="menuitem"
            style={styles.item}>
            <HStack gap="md" align="center">
              <Icon name={item.icon} size="sm" color={item.destructive ? 'danger' : 'text'} />
              <Text variant="body" color={item.destructive ? 'danger' : 'text'}>
                {item.label}
              </Text>
            </HStack>
          </PressableScale>
        ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 32,
    paddingTop: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
});
