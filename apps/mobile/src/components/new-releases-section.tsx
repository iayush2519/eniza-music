import { Skeleton, Text, VStack } from '@music-app/design-system';
import type { Album } from '@music-app/shared-types';
import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { AlbumCard } from '@/components/album-card';
import { useNewReleases } from '@/hooks/use-new-releases';

const CARD_WIDTH = 140;

/**
 * "New Releases" — a horizontally-scrolling, infinitely-paginated row of
 * `AlbumCard`s, backed by `GET /catalog/albums/new-releases` (see
 * `useNewReleases`). Kept as its own component (not inlined into
 * `(tabs)/index.tsx`) because it owns a second, independent
 * infinite-scroll list nested inside Home's outer vertical one — Home
 * itself only needs to render this component once and never touches its
 * pagination state directly.
 */
export function NewReleasesSection() {
  const newReleasesQuery = useNewReleases();
  const albums = newReleasesQuery.data?.pages.flat() ?? [];

  if (newReleasesQuery.isLoading) {
    return (
      <VStack gap="sm">
        <Text variant="bodyStrong">New releases</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[0, 1, 2]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          renderItem={() => <Skeleton width={CARD_WIDTH} height={CARD_WIDTH + 48} radius="xl" />}
          ItemSeparatorComponent={() => <VStack gap="sm" style={styles.horizontalGap} />}
        />
      </VStack>
    );
  }

  if (albums.length === 0) {
    // Omitted entirely rather than an empty-state placeholder — a sparse
    // or empty local metadata cache (see albums.service.ts's own doc
    // comment on `findNewReleases`) is expected on a fresh install, and
    // Home already omits every other section with nothing to show
    // (recommendations.service.ts's established pattern).
    return null;
  }

  return (
    <VStack gap="sm">
      <Text variant="bodyStrong">New releases</Text>
      <FlatList<Album>
        horizontal
        showsHorizontalScrollIndicator={false}
        data={albums}
        keyExtractor={(album) => album.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AlbumCard album={item} style={styles.card} onPress={() => router.push(`/album/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <VStack gap="sm" style={styles.horizontalGap} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (newReleasesQuery.hasNextPage && !newReleasesQuery.isFetchingNextPage) {
            void newReleasesQuery.fetchNextPage();
          }
        }}
      />
    </VStack>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingRight: 4,
  },
  horizontalGap: {
    width: 12,
  },
  card: {
    width: CARD_WIDTH,
  },
});
