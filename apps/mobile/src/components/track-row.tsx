import { HStack, Surface, Text, VStack } from '@music-app/design-system';
import type { Track } from '@music-app/shared-types';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { formatDuration } from '@/lib/format';

type TrackRowProps = {
  track: Track;
  /** Resolved from `artistId` by the caller — `Track` itself only carries
   * the id (see @music-app/shared-types), not a denormalized name. */
  artistName?: string;
};

/**
 * A single row in a track list, shared by the Home feed and Explore
 * search results so both look identical. Tapping a row to actually play
 * the track is a Phase 5 (audio playback engine) concern — see
 * docs/roadmap.md — so this is display-only for now.
 */
export function TrackRow({ track, artistName }: TrackRowProps) {
  return (
    <Surface color="surface" radius="md" style={styles.row}>
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
        <Text variant="caption" color="textTertiary">
          {formatDuration(track.durationSeconds)}
        </Text>
      </HStack>
    </Surface>
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
