import { Avatar, PressableScale, Surface, Text, VStack } from '@music-app/design-system';
import type { Artist } from '@music-app/shared-types';
import { StyleSheet } from 'react-native';

export type ArtistCardProps = {
  artist: Artist;
  onPress?: () => void;
};

const CARD_WIDTH = 120;

/**
 * A rounded card for an artist's photo + name — "ArtistCard, Full Round"
 * per docs/design/design-system-specification.md's component inventory.
 * Circular artwork (radius_pill) distinguishes it from `AlbumCard`'s
 * squared artwork, matching the approved UI board's artist rows.
 */
export function ArtistCard({ artist, onPress }: ArtistCardProps) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <Surface color="surface" radius="xl" elevation="raised" style={styles.card}>
        <Avatar source={artist.avatarUrl} initials={artist.name} size="lg" />
        <VStack style={styles.textColumn}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.centerText}>
            {artist.name}
          </Text>
        </VStack>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  textColumn: {
    width: '100%',
  },
  centerText: {
    textAlign: 'center',
  },
});
