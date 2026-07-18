import { PressableScale, Surface, Text, VStack } from '@music-app/design-system';
import type { Album } from '@music-app/shared-types';
import { Image } from 'expo-image';
import { StyleSheet, type ViewStyle } from 'react-native';

export type AlbumCardProps = {
  album: Album;
  artistName?: string;
  onPress?: () => void;
  /** `vertical` (default): tall card, artwork on top, per the Home feed's
   * "New Wave" grid. `horizontal`: square artwork left, text right, per
   * Explore's curated-playlist rows. Both variants are named
   * "AlbumCard... Horizontal, Vertical" in
   * docs/design/design-system-specification.md's component inventory. */
  variant?: 'vertical' | 'horizontal';
  style?: ViewStyle;
};

/**
 * A grid card for album artwork + title/artist — "AlbumCard" per the
 * approved component inventory. radius_xl (20px, "Standard cards (album,
 * artist), list items" per spec §0). `vertical` has no intrinsic width of
 * its own — the caller sizes it (e.g. Library's 2-column grid passes
 * `flex: 1`), matching the approved board's grid, where every card in a
 * row shares the row width evenly rather than using a fixed pixel width.
 */
export function AlbumCard({ album, artistName, onPress, variant = 'vertical', style }: AlbumCardProps) {
  const isHorizontal = variant === 'horizontal';

  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <Surface
        color="surface"
        radius="xl"
        elevation="raised"
        style={[isHorizontal ? styles.horizontalCard : styles.verticalCard, style]}>
        <Image
          source={album.coverArtUrl ?? undefined}
          style={isHorizontal ? styles.horizontalArtwork : styles.verticalArtwork}
          contentFit="cover"
          transition={150}
        />
        <VStack gap="xs" style={isHorizontal ? styles.horizontalTextColumn : styles.verticalTextColumn}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {album.title}
          </Text>
          {artistName ? (
            <Text variant="label" color="textSecondary" numberOfLines={1}>
              {artistName}
            </Text>
          ) : null}
        </VStack>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  verticalCard: {
    padding: 8,
    gap: 8,
  },
  verticalArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  verticalTextColumn: {
    paddingHorizontal: 4,
  },
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  horizontalArtwork: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  horizontalTextColumn: {
    flex: 1,
  },
});
