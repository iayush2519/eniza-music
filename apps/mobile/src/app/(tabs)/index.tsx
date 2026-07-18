import { EmptyState as DsEmptyState, ErrorState, Skeleton, SkeletonRow, Surface, Text, VStack } from '@music-app/design-system';
import type { RecommendationSection, Track } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import { MiniPlayer } from '@/components/mini-player';
import { RecommendationCard } from '@/components/recommendation-card';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';
import { buildResolvedQueue } from '@/lib/play-queue';
import { usePlaybackStore } from '@/stores/playback-store';

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
 *
 * The first section renders as a `RecommendationCard` "hero" (matching
 * the approved UI board's "ENIZA Daily Soundscape" card); every
 * subsequent section renders as a plain track list, matching the board's
 * "Curated For You"/"New Wave" sections.
 */
export default function HomeScreen() {
  const artistNames = useArtistNameMap();
  const sectionsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => apiClient.recommendations.getSections(),
  });
  const load = usePlaybackStore((state) => state.load);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentTrackId = usePlaybackStore((state) => state.queue[currentIndex]?.trackId);

  const sections = sectionsQuery.data ?? [];
  const heroSection = sections[0];
  const listSections = sections.slice(1);

  const playSection = async (section: RecommendationSection, startIndex: number) => {
    const { queue, startIndex: resolvedIndex } = await buildResolvedQueue(
      section.tracks,
      startIndex,
      artistNames,
    );
    await load(queue, resolvedIndex);
  };

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<RecommendationSection>
          data={listSections}
          keyExtractor={(section) => section.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <VStack gap="lg" style={styles.headerStack}>
              <Header variant="home" />
              {sectionsQuery.isLoading ? (
                <Skeleton width="100%" height={140} radius="xxl" />
              ) : heroSection ? (
                <RecommendationCard section={heroSection} onPress={() => void playSection(heroSection, 0)} />
              ) : null}
            </VStack>
          }
          ListEmptyComponent={
            <HomeEmptyState
              isLoading={sectionsQuery.isLoading}
              isError={sectionsQuery.isError}
              onRetry={() => void sectionsQuery.refetch()}
              hasHero={Boolean(heroSection)}
            />
          }
          renderItem={({ item }) => (
            <RecommendationSectionView
              section={item}
              artistNames={artistNames}
              currentTrackId={currentTrackId}
              onTrackPress={(index) => void playSection(item, index)}
            />
          )}
          ItemSeparatorComponent={() => <VStack gap="lg" />}
        />
        <MiniPlayer />
      </SafeAreaView>
    </Surface>
  );
}

function RecommendationSectionView({
  section,
  artistNames,
  currentTrackId,
  onTrackPress,
}: {
  section: RecommendationSection;
  artistNames: Map<string, string>;
  currentTrackId?: string;
  onTrackPress: (index: number) => void;
}) {
  return (
    <VStack gap="sm">
      <Text variant="bodyStrong">{section.title}</Text>
      <VStack gap="sm">
        {section.tracks.map((track: Track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            artistName={artistNames.get(track.artistId)}
            isPlaying={track.id === currentTrackId}
            onPress={() => onTrackPress(index)}
          />
        ))}
      </VStack>
    </VStack>
  );
}

function HomeEmptyState({
  isLoading,
  isError,
  onRetry,
  hasHero,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasHero: boolean;
}) {
  if (isLoading) {
    return (
      <VStack gap="sm">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </VStack>
    );
  }
  if (isError) {
    return <ErrorState description="Could not load your recommendations." onRetry={onRetry} />;
  }
  if (hasHero) {
    // The hero card itself has content; only the *list* is empty, so a
    // full-screen empty state would be misleading here.
    return null;
  }
  return (
    <DsEmptyState
      icon="compass"
      title="Nothing here yet"
      description="Play or like a few tracks to get personalized recommendations."
    />
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
    gap: 0,
  },
  headerStack: {
    paddingBottom: 8,
  },
});
