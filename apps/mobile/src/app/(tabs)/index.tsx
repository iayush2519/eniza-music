import { Surface, Text, VStack } from '@music-app/design-system';
import type { Track } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';

/**
 * The home feed: every track in the catalog, newest first (the backend's
 * `TracksService.findAll` already orders by `createdAt` — see
 * apps/api/src/catalog/tracks.service.ts). Catalog browsing is public
 * (see docs/architecture/content-model.md), so this screen works
 * regardless of auth state, same as the backend endpoint it calls.
 */
export default function HomeScreen() {
  const artistNames = useArtistNameMap();
  const tracksQuery = useQuery({
    queryKey: ['catalog', 'tracks'],
    queryFn: () => apiClient.catalog.listTracks(),
  });

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<Track>
          data={tracksQuery.data ?? []}
          keyExtractor={(track) => track.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text variant="title" style={styles.title}>
              Home
            </Text>
          }
          ListEmptyComponent={<EmptyState isLoading={tracksQuery.isLoading} isError={tracksQuery.isError} />}
          renderItem={({ item }) => <TrackRow track={item} artistName={artistNames.get(item.artistId)} />}
          ItemSeparatorComponent={() => <VStack gap="sm" />}
        />
      </SafeAreaView>
    </Surface>
  );
}

function EmptyState({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return <ActivityIndicator style={styles.centerPad} />;
  }
  return (
    <Text variant="label" color="textSecondary" style={styles.centerPad}>
      {isError ? 'Could not load tracks. Pull to refresh.' : 'No tracks yet.'}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
    gap: 0,
  },
  title: {
    paddingVertical: 16,
  },
  centerPad: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
