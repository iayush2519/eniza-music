import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '../theme/use-reduced-motion';
import { spring } from '../tokens/motion';

export type ReorderableListProps<T> = {
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  /** Fixed row height in px — every row must be the same height, since
   * position math (which slot a drag is currently hovering over) is done
   * by dividing a pixel offset by this constant rather than measuring
   * each row individually. */
  rowHeight: number;
  renderItem: (params: { item: T; index: number; isDragging: boolean }) => ReactNode;
  /** Called once, when a drag ends on a different index than it started
   * at. Never called for a drag that ends back on its starting index. */
  onReorder: (fromIndex: number, toIndex: number) => void;
};

/**
 * A drag-to-reorder list built directly on `react-native-gesture-
 * handler`'s `Gesture.Pan` + Reanimated shared values — the first
 * component in the app to actually use the gesture foundation mounted at
 * the root (`GestureHandlerRootView`, see apps/mobile/src/app/_layout.tsx)
 * for something beyond a tap. No new list-reordering dependency was
 * added for this: the app already has everything needed, and Phase 5's
 * gesture requirement is explicitly to build on the *existing*
 * GestureHandler foundation, not extend the dependency surface for one
 * feature.
 *
 * Three shared values, owned here and passed to every row, are what make
 * the "other rows shift out of the way" effect work without React
 * re-rendering the whole list on every frame of a drag:
 * - `activeIndex`: which row is currently being dragged (-1 = none).
 * - `dragTranslateY`: the active row's live pixel offset from its own
 *   resting slot, updated continuously by the pan gesture.
 * - `hoverIndex`: which slot the active row is currently hovering over
 *   (`activeIndex`'s resting position + `dragTranslateY`, snapped to the
 *   nearest row-height increment).
 *
 * Every row's `useAnimatedStyle` reads all three reactively: the active
 * row follows `dragTranslateY` directly (no spring — direct 1:1 tracking
 * is what makes a drag feel attached to the finger); every other row
 * computes whether it currently sits between `activeIndex` and
 * `hoverIndex` and, if so, animates one slot out of the way. This is the
 * standard shared-value-driven pattern for a hand-rolled reorderable
 * list (each row reacts to shared state, rather than the whole list
 * re-rendering per drag frame).
 */
export function ReorderableList<T>({
  data,
  keyExtractor,
  rowHeight,
  renderItem,
  onReorder,
}: ReorderableListProps<T>) {
  const isReducedMotion = useReducedMotion();
  const activeIndex = useSharedValue(-1);
  const dragTranslateY = useSharedValue(0);
  const hoverIndex = useSharedValue(-1);
  // The one piece of React state: mirrors `activeIndex` for the purposes
  // of `renderItem`'s `isDragging` flag (so a row can e.g. show a
  // stronger shadow while dragging) — everything else stays in shared
  // values so a drag never triggers a React re-render per frame.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item, index) => (
        <ReorderableRow
          key={keyExtractor(item, index)}
          index={index}
          itemCount={data.length}
          rowHeight={rowHeight}
          activeIndex={activeIndex}
          dragTranslateY={dragTranslateY}
          hoverIndex={hoverIndex}
          isReducedMotion={isReducedMotion}
          onDragStart={() => setDraggingIndex(index)}
          onDragEnd={(finalIndex) => {
            setDraggingIndex(null);
            if (finalIndex !== index) {
              onReorder(index, finalIndex);
            }
          }}>
          {renderItem({ item, index, isDragging: draggingIndex === index })}
        </ReorderableRow>
      ))}
    </View>
  );
}

type ReorderableRowProps = {
  index: number;
  itemCount: number;
  rowHeight: number;
  activeIndex: SharedValue<number>;
  dragTranslateY: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  isReducedMotion: boolean;
  onDragStart: () => void;
  onDragEnd: (finalIndex: number) => void;
  children: ReactNode;
};

function ReorderableRow({
  index,
  itemCount,
  rowHeight,
  activeIndex,
  dragTranslateY,
  hoverIndex,
  isReducedMotion,
  onDragStart,
  onDragEnd,
  children,
}: ReorderableRowProps) {
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      // eslint-disable-next-line react-hooks/immutability
      activeIndex.value = index;
      // eslint-disable-next-line react-hooks/immutability
      hoverIndex.value = index;
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      // eslint-disable-next-line react-hooks/immutability
      dragTranslateY.value = event.translationY;
      const slotDelta = Math.round(event.translationY / rowHeight);
      const nextHoverIndex = Math.min(Math.max(index + slotDelta, 0), itemCount - 1);
      // eslint-disable-next-line react-hooks/immutability
      hoverIndex.value = nextHoverIndex;
    })
    .onEnd(() => {
      const finalIndex = hoverIndex.value;
      // eslint-disable-next-line react-hooks/immutability
      dragTranslateY.value = isReducedMotion ? 0 : withSpring(0, spring.standard);
      // eslint-disable-next-line react-hooks/immutability
      activeIndex.value = -1;
      // eslint-disable-next-line react-hooks/immutability
      hoverIndex.value = -1;
      runOnJS(onDragEnd)(finalIndex);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const baseTop = index * rowHeight;
    const isActive = activeIndex.value === index;

    if (isActive) {
      return {
        top: baseTop,
        transform: [{ translateY: dragTranslateY.value }],
        zIndex: 1,
        elevation: 4,
      };
    }

    // A passive row: if this row's slot currently sits strictly between
    // the dragged row's original slot and its live hover slot, shift it
    // by exactly one row height to make room — the standard "other
    // items part to let the dragged one through" reorder effect.
    let displacement = 0;
    if (activeIndex.value !== -1) {
      const dragOrigin = activeIndex.value;
      const dragTarget = hoverIndex.value;
      if (dragOrigin < dragTarget && index > dragOrigin && index <= dragTarget) {
        displacement = -rowHeight;
      } else if (dragOrigin > dragTarget && index < dragOrigin && index >= dragTarget) {
        displacement = rowHeight;
      }
    }

    const animate = isReducedMotion
      ? (value: number) => value
      : (value: number) => withTiming(value, { duration: 180 });

    return {
      top: baseTop,
      transform: [{ translateY: animate(displacement) }],
      zIndex: 0,
      elevation: 0,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, { height: rowHeight }, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
