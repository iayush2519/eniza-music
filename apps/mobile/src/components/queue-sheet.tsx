import {
  EqualizerGlyph,
  Icon,
  ReorderableList,
  Text,
  useDeferredVisibility,
  useReducedMotion,
  useTheme,
  VStack,
} from '@music-app/design-system';
import type { QueueItem } from '@music-app/audio-engine';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const EXIT_DURATION = 220;
const ROW_HEIGHT = 64;

export type QueueSheetProps = {
  visible: boolean;
  queue: QueueItem[];
  currentIndex: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectIndex: (index: number) => void;
  onDismiss: () => void;
};

/**
 * "Playback queue... Queue reordering" per Phase 5's scope — a
 * bottom-sheet list of the current queue, long-press-and-drag to
 * reorder. Built on `ReorderableList` (see
 * @music-app/design-system/primitives/reorderable-list.tsx), the first
 * component in the app to actually use the `GestureHandlerRootView`
 * foundation mounted at the root for something beyond a tap — see that
 * component's own doc comment for why no new drag-list dependency was
 * added for this.
 */
export function QueueSheet({ visible, queue, currentIndex, onReorder, onSelectIndex, onDismiss }: QueueSheetProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const shouldRender = useDeferredVisibility(visible, EXIT_DURATION);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = isReducedMotion
      ? visible
        ? 1
        : 0
      : withTiming(visible ? 1 : 0, { duration: EXIT_DURATION });
  }, [visible, isReducedMotion, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 40 }],
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
        accessibilityLabel="Dismiss queue"
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
        <Text variant="title" style={styles.title}>
          Playing next
        </Text>

        <ScrollView contentContainerStyle={styles.listContent}>
          <ReorderableList<QueueItem>
            data={queue}
            keyExtractor={(item) => item.trackId}
            rowHeight={ROW_HEIGHT}
            onReorder={onReorder}
            renderItem={({ item, index, isDragging }) => {
              const isCurrent = index === currentIndex;
              return (
                <Pressable
                  onPress={() => onSelectIndex(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}${isCurrent ? ', now playing' : ''}. Long-press to reorder.`}
                  style={[styles.row, isDragging && { backgroundColor: theme.colors.surfacePressed }]}>
                  <Image source={item.artworkUrl ?? undefined} style={styles.artwork} contentFit="cover" />
                  <VStack gap="xs" style={styles.textColumn}>
                    <Text variant="bodyStrong" numberOfLines={1} color={isCurrent ? 'accent' : 'text'}>
                      {item.title}
                    </Text>
                    {item.artistName ? (
                      <Text variant="label" color="textSecondary" numberOfLines={1}>
                        {item.artistName}
                      </Text>
                    ) : null}
                  </VStack>
                  {isCurrent ? (
                    <EqualizerGlyph color="accent" animated size={16} />
                  ) : (
                    <Icon name="menu" size="sm" color="textTertiary" accessibilityLabel="Drag to reorder" />
                  )}
                </Pressable>
              );
            }}
          />
        </ScrollView>
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
    top: '35%',
    paddingTop: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    height: ROW_HEIGHT,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  textColumn: {
    flex: 1,
  },
});
