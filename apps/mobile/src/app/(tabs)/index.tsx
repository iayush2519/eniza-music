import { Surface, Text, VStack } from '@music-app/design-system';
import type { RecommendationSection, Track } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';

/**
 * The personalized landing page — per
 * docs/architecture/music-provider-architecture.md, Home stays the
 * personalized landing page (recommendations, recently played, your
 * playlists), not replaced by Search; Search is a separate, permanent
 * tab. Backed by `GET /recommendations`
 * (apps/api/src/recommendations/recommendations.controller.ts), which
 * returns a list of sections ("Recently played", "For you", `Because
 * you liked "X"`) computed from the signed-in user's own listening
 * history and likes — see recommendations.service.ts. Sections the
 * backend has no data for simply aren't included, rather than rendering
 * as empty placeholders.
 */
export default function HomeScreen() {
  const artistNames = useArtistNameMap();
  const sectionsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => apiClient.recommendations.getSections(),
  });

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<RecommendationSection>
          data={sectionsQuery.data ?? []}
          keyExtractor={(section) => section.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text variant="title" style={styles.title}>
              Home
            </Text>
          }
          ListEmptyComponent={
            <EmptyState isLoading={sectionsQuery.isLoading} isError={sectionsQuery.isError} />
          }
          renderItem={({ item }) => <RecommendationSectionView section={item} artistNames={artistNames} />}
          ItemSeparatorComponent={() => <VStack gap="lg" />}
        />
      </SafeAreaView>
    </Surface>
  );
}

function RecommendationSectionView({
  section,
  artistNames,
}: {
  section: RecommendationSection;
  artistNames: Map<string, string>;
}) {
  return (
    <VStack gap="sm">
      <Text variant="bodyStrong">{section.title}</Text>
      <VStack gap="sm">
        {section.tracks.map((track: Track) => (
          <TrackRow key={track.id} track={track} artistName={artistNames.get(track.artistId)} />
        ))}
      </VStack>
    </VStack>
  );
}

function EmptyState({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return <ActivityIndicator style={styles.centerPad} />;
  }
  return (
    <Text variant="label" color="textSecondary" style={styles.centerPad}>
      {isError
        ? 'Could not load your recommendations. Pull to refresh.'
        : 'Play or like a few tracks to get personalized recommendations.'}
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
