import { Surface, Text, VStack } from '@music-app/design-system';
import type { Track } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/text-field';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';

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

  const trimmedQuery = query.trim();
  const searchQuery = useQuery({
    queryKey: ['search', 'tracks', trimmedQuery],
    queryFn: () => apiClient.search.search(trimmedQuery, 'track'),
    enabled: trimmedQuery.length > 0,
  });

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<Track>
          data={trimmedQuery.length > 0 ? searchQuery.data?.tracks ?? [] : []}
          keyExtractor={(track) => track.id}
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
            <EmptyState
              hasQuery={trimmedQuery.length > 0}
              isLoading={searchQuery.isLoading}
              isError={searchQuery.isError}
            />
          }
          renderItem={({ item }) => <TrackRow track={item} artistName={artistNames.get(item.artistId)} />}
          ItemSeparatorComponent={() => <VStack gap="sm" />}
        />
      </SafeAreaView>
    </Surface>
  );
}

function EmptyState({
  hasQuery,
  isLoading,
  isError,
}: {
  hasQuery: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  if (!hasQuery) {
    return (
      <Text variant="label" color="textSecondary" style={styles.centerPad}>
        Search for a track by title.
      </Text>
    );
  }
  if (isLoading) {
    return <ActivityIndicator style={styles.centerPad} />;
  }
  return (
    <Text variant="label" color="textSecondary" style={styles.centerPad}>
      {isError ? 'Search failed. Try again.' : 'No matching tracks.'}
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
  },
  header: {
    paddingVertical: 16,
  },
  centerPad: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
