import { EqualizerGlyph, HStack, PressableScale, Surface, Text, VStack } from '@music-app/design-system';
import type { Track } from '@music-app/shared-types';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { formatDuration } from '@/lib/format';

type TrackRowProps = {
  track: Track;
  /** Resolved from `artistId` by the caller — `Track` itself only carries
   * the id (see @music-app/shared-types), not a denormalized name. */
  artistName?: string;
  /** Called on tap. Omit to render a non-interactive row (unused
   * anywhere currently, but keeps this component usable in a
   * display-only context without a playback dependency). */
  onPress?: () => void;
  /** Highlights the row and swaps the duration for a small animated
   * equalizer glyph — set by the caller when this row is the queue's
   * current item. */
  isPlaying?: boolean;
};

/**
 * A single row in a track list, shared by the Home feed and Explore
 * search results so both look identical. Tapping plays the track
 * immediately, per docs/architecture/music-provider-architecture.md's
 * product flow ("...Tap Track -> Immediate Playback") — the caller
 * supplies `onPress` (building and loading the right queue for its own
 * list; see `@/lib/play-queue.ts`), this component only renders the row.
 */
export function TrackRow({ track, artistName, onPress, isPlaying = false }: TrackRowProps) {
  return (
    <PressableScale
      scaleTo={0.98}
      opacityTo={0.7}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      <Surface color={isPlaying ? 'surfaceSelected' : 'surface'} radius="md" style={styles.row}>
        <HStack gap="md" align="center">
          <Image
            source={track.coverArtUrl ?? undefined}
            style={styles.artwork}
            contentFit="cover"
            transition={150}
          />
          <VStack gap="xs" style={styles.titleColumn}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {track.title}
            </Text>
            {artistName ? (
              <Text variant="label" color="textSecondary" numberOfLines={1}>
                {artistName}
              </Text>
            ) : null}
          </VStack>
          {isPlaying ? (
            <EqualizerGlyph color="accent" animated size={16} />
          ) : (
            <Text variant="caption" color="textTertiary">
              {formatDuration(track.durationSeconds)}
            </Text>
          )}
        </HStack>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  titleColumn: {
    flex: 1,
  },
});
