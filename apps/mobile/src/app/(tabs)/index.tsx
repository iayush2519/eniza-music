import { EmptyState as DsEmptyState, ErrorState, Skeleton, SkeletonRow, Surface, Text, VStack } from '@music-app/design-system';
import type { RecommendationSection, Track } from '@music-app/shared-types';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import { MiniPlayer } from '@/components/mini-player';
import { NewReleasesSection } from '@/components/new-releases-section';
import { QuickActions, type QuickAction } from '@/components/quick-actions';
import { RecommendationCard } from '@/components/recommendation-card';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';
import { getHomeGreeting } from '@/lib/greeting';
import { buildResolvedQueue } from '@/lib/play-queue';
import { useAuthStore } from '@/stores/auth-store';
import { usePlaybackStore } from '@/stores/playback-store';

/**
 * The personalized landing page — per
 * docs/architecture/music-provider-architecture.md, Home stays the
 * personalized landing page (recommendations, recently played, your
 * playlists), not replaced by Search; Search is a separate, permanent
 * tab. Backed by `GET /recommendations`
 * (apps/api/src/recommendations/recommendations.controller.ts), which
 * returns a list of sections computed from the signed-in user's own
 * listening history and likes, plus one cross-user "Trending now"
 * section — see recommendations.service.ts. Sections the backend has no
 * data for simply aren't included, rather than rendering as empty
 * placeholders — this is what keeps the screen scalable for a future AI
 * recommendations section: it's just another entry in this same list,
 * requiring no new rendering logic here.
 *
 * The first section renders as a `RecommendationCard` "hero" (matching
 * the approved UI board's "ENIZA Daily Soundscape" card); every
 * subsequent section renders as a plain track list. "New Releases" is a
 * separate, independently-paginated horizontal section (see
 * `NewReleasesSection`) rendered after every recommendation section,
 * since it comes from a different endpoint (the local album cache, not
 * `/recommendations`) and has its own infinite-scroll state.
 *
 * Offline-friendly behavior note: this screen relies on React Query's
 * existing in-memory cache (a failed background refetch falls back to
 * already-cached data rather than clearing the screen) rather than a
 * persisted cross-launch cache — a persisted cache would need a new
 * dependency (e.g. an AsyncStorage-backed persister), which is out of
 * scope for this pass; see the Phase 4 completion report for the
 * explicit call-out.
 */
export default function HomeScreen() {
  const displayName = useAuthStore((state) => state.user?.displayName);
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

  const greeting = useMemo(() => getHomeGreeting(new Date().getHours()), []);
  const nameParts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName = nameParts[0];
  // First letter of first + last name (e.g. "John Doe" -> "JD"), falling
  // back to just the first letter for a single-word name — `Avatar`
  // itself only ever reads the first two characters it's given, so this
  // is the one place that decides *which* two characters are meaningful.
  const initials =
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : nameParts[0]?.slice(0, 2);

  const quickActions: QuickAction[] = [
    { key: 'search', label: 'Search', icon: 'search', onPress: () => router.push('/(tabs)/explore') },
    { key: 'library', label: 'Library', icon: 'list', onPress: () => router.push('/(tabs)/library') },
    {
      key: 'shuffle',
      label: 'Shuffle',
      icon: 'shuffle',
      onPress: () => {
        const allTracks = sections.flatMap((section) => section.tracks);
        if (allTracks.length > 0) {
          void playSection({ id: 'shuffle', title: 'Shuffle', tracks: allTracks }, 0);
        }
      },
    },
  ];

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
          refreshControl={
            <RefreshControl
              refreshing={sectionsQuery.isRefetching}
              onRefresh={() => void sectionsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <VStack gap="lg" style={styles.headerStack}>
              <Header
                variant="home"
                avatarInitials={initials}
                onSearchPress={() => router.push('/(tabs)/explore')}
              />
              <VStack gap="xs">
                <Text variant="title">
                  {greeting}
                  {firstName ? `, ${firstName}` : ''}
                </Text>
              </VStack>
              <QuickActions actions={quickActions} />
              {sectionsQuery.isLoading ? (
                <Skeleton width="100%" height={140} radius="xxl" />
              ) : heroSection ? (
                <RecommendationCard section={heroSection} onPress={() => void playSection(heroSection, 0)} />
              ) : null}
            </VStack>
          }
          ListFooterComponent={sectionsQuery.isLoading ? null : <NewReleasesSection />}
          ListFooterComponentStyle={styles.footer}
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
  footer: {
    marginTop: 24,
  },
});
