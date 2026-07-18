import { EmptyState, ErrorState, Surface, Text, VStack } from '@music-app/design-system';
import type { Track } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { TextField } from '@/components/text-field';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';
import { buildResolvedQueue } from '@/lib/play-queue';
import { usePlaybackStore } from '@/stores/playback-store';

/**
 * The primary discovery entry point — per
 * docs/architecture/music-provider-architecture.md's product flow
 * ("Open App → Home ⇄ Search → Results → Tap Track → Immediate
 * Playback"). Backed by the real provider-cache-aware `GET /search`
 * endpoint (apps/api/src/discovery/search.controller.ts), scoped to
 * tracks only for this screen — album/artist results are returned by the
 * same endpoint but have no dedicated UI yet. The query is debounced
 * client-side via TanStack Query's `enabled` gate rather than firing on
 * every keystroke.
 */
export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const artistNames = useArtistNameMap();
  const load = usePlaybackStore((state) => state.load);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentTrackId = usePlaybackStore((state) => state.queue[currentIndex]?.trackId);

  const trimmedQuery = query.trim();
  const searchQuery = useQuery({
    queryKey: ['search', 'tracks', trimmedQuery],
    queryFn: () => apiClient.search.search(trimmedQuery, 'track'),
    enabled: trimmedQuery.length > 0,
  });

  const results = trimmedQuery.length > 0 ? searchQuery.data?.tracks ?? [] : [];

  const playTrack = async (index: number) => {
    const { queue, startIndex } = await buildResolvedQueue(results, index, artistNames);
    await load(queue, startIndex);
  };

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<Track>
          data={results}
          keyExtractor={(track) => track.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <VStack gap="md" style={styles.header}>
              <Text variant="title">Explore</Text>
              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder="Search tracks"
                autoCapitalize="none"
                autoCorrect={false}
                testID="explore-search-input"
              />
            </VStack>
          }
          ListEmptyComponent={
            <ExploreEmptyState
              hasQuery={trimmedQuery.length > 0}
              isLoading={searchQuery.isLoading}
              isError={searchQuery.isError}
              onRetry={() => void searchQuery.refetch()}
            />
          }
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              artistName={artistNames.get(item.artistId)}
              isPlaying={item.id === currentTrackId}
              onPress={() => void playTrack(index)}
            />
          )}
          ItemSeparatorComponent={() => <VStack gap="sm" />}
        />
        <MiniPlayer />
      </SafeAreaView>
    </Surface>
  );
}

function ExploreEmptyState({
  hasQuery,
  isLoading,
  isError,
  onRetry,
}: {
  hasQuery: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (!hasQuery) {
    return <EmptyState icon="search" title="Search for music" description="Search for a track by title." />;
  }
  if (isLoading) {
    return (
      <VStack gap="sm" style={styles.centerPad}>
        <Text variant="label" color="textSecondary" style={styles.centerText}>
          Searching…
        </Text>
      </VStack>
    );
  }
  if (isError) {
    return <ErrorState description="Search failed." onRetry={onRetry} />;
  }
  return <EmptyState icon="search" title="No matching tracks" description="Try a different search term." />;
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
  },
  header: {
    paddingVertical: 16,
  },
  centerPad: {
    paddingVertical: 32,
  },
  centerText: {
    textAlign: 'center',
  },
});
