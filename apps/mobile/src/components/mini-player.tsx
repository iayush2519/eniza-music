import { EqualizerGlyph, HStack, IconButton, PressableScale, ProgressSeekBar, Surface, Text, VStack } from '@music-app/design-system';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { usePlaybackStore } from '@/stores/playback-store';

export type MiniPlayerProps = {
  /** Tapping the player body (outside the play/pause control) — intended
   * to later expand into the Full Player (Phase 5). Omit to render the
   * mini-player as a static bar. */
  onExpand?: () => void;
};

/**
 * The sticky playback bar shown above the tab bar — "MiniPlayer, Sticky
 * playback control overlay above Tab Bar" per
 * docs/design/design-system-specification.md's component inventory.
 * 64px height per the deprecated-but-still-accurate-on-this-point
 * dimension note; renders nothing when the queue is empty, matching the
 * approved board (no mini-player is shown on empty-state screens).
 *
 * Reads `usePlaybackStore` directly — the same store `TrackRow`'s tap
 * handler now dispatches to (see track-row.tsx) — so play/pause here and
 * a track tap elsewhere always agree, per the store's own
 * single-direction rule (native engine -> store -> every UI reader).
 */
export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const queue = usePlaybackStore((state) => state.queue);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const status = usePlaybackStore((state) => state.status);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const seekTo = usePlaybackStore((state) => state.seekTo);

  const currentItem = currentIndex >= 0 ? queue[currentIndex] : undefined;

  if (!currentItem) {
    return null;
  }

  const isPlaying = status === 'playing';
  const isBuffering = status === 'buffering' || status === 'loading';
  const progress = currentItem.durationMs > 0 ? positionMs / currentItem.durationMs : 0;

  return (
    <Surface color="backgroundElevated" radius="xl" elevation="floating" style={styles.container}>
      <PressableScale
        scaleTo={0.99}
        opacityTo={0.85}
        onPress={onExpand}
        disabled={!onExpand}
        accessibilityRole={onExpand ? 'button' : undefined}
        accessibilityLabel={onExpand ? 'Expand player' : undefined}
        style={styles.body}>
        <HStack gap="md" align="center" style={styles.row}>
          <Image
            source={currentItem.artworkUrl ?? undefined}
            style={styles.artwork}
            contentFit="cover"
            transition={150}
          />
          <VStack gap="xs" style={styles.textColumn}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {currentItem.title}
            </Text>
            {currentItem.artistName ? (
              <Text variant="label" color="textSecondary" numberOfLines={1}>
                {currentItem.artistName}
              </Text>
            ) : null}
          </VStack>
          {isBuffering ? (
            <EqualizerGlyph color="textSecondary" animated size={20} />
          ) : (
            <IconButton
              name={isPlaying ? 'pause' : 'play'}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              onPress={() => void (isPlaying ? pause() : play())}
              variant="filled"
            />
          )}
        </HStack>
      </PressableScale>
      <ProgressSeekBar
        progress={progress}
        onSeek={(ratio) => void seekTo(ratio * currentItem.durationMs)}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  body: {
    paddingBottom: 4,
  },
  row: {},
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  textColumn: {
    flex: 1,
  },
});
