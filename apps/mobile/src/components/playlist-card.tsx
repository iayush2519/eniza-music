import { HStack, Icon, PressableScale, Surface, Text, VStack } from '@music-app/design-system';
import type { Playlist } from '@music-app/shared-types';
import { StyleSheet } from 'react-native';

export type PlaylistCardProps = {
  playlist: Playlist;
  onPress?: () => void;
};

/**
 * A full-width list row for a playlist — "PlaylistCard, Standard list
 * item for playlists" per the approved component inventory. Playlists
 * have no artwork field of their own (see @music-app/shared-types), so
 * this renders a themed folder glyph in a rounded tile in place of
 * artwork, rather than a missing/broken image.
 */
export function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <Surface color="surface" radius="xl" elevation="raised" style={styles.card}>
        <HStack gap="md" align="center">
          <Surface color="accentMuted" radius="lg" style={styles.artworkFallback}>
            <Icon name="music" size="md" color="accent" />
          </Surface>
          <VStack gap="xs" style={styles.textColumn}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {playlist.title}
            </Text>
            {playlist.description ? (
              <Text variant="label" color="textSecondary" numberOfLines={1}>
                {playlist.description}
              </Text>
            ) : null}
          </VStack>
        </HStack>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
  },
  artworkFallback: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
});
