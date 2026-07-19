import { Avatar, EmptyState, ErrorState, IconButton, Skeleton, SkeletonRow, Surface, Text, VStack } from '@music-app/design-system';
import type { Album } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album-card';
import { Header } from '@/components/header';
import { MiniPlayer } from '@/components/mini-player';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { useIsArtistFollowed, useToggleSavedArtist } from '@/hooks/use-artist-followed';
import { apiClient } from '@/lib/api-client';
import { buildResolvedQueue } from '@/lib/play-queue';
import { usePlaybackStore } from '@/stores/playback-store';

/**
 * "Artist Details" per Phase 5's scope. No dedicated Artist Details
 * hierarchy is spelled out in
 * docs/design/design-system-specification.md's Screen Architecture (only
 * "Album Details"/"Full Player"/"Lyrics"/"Equalizer"/"Sleep Timer" are
 * itemized there under MUSIC Views) — built from the same Header ->
 * Avatar/Identity -> content-sections pattern Album Detail establishes,
 * plus the approved component inventory's `ArtistCard`/`AlbumCard`
 * building blocks, per "if the visible mockup is incomplete, use the
 * approved design system together with the visible UI board."
 */
export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistNames = useArtistNameMap();
  const load = usePlaybackStore((state) => state.load);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentTrackId = usePlaybackStore((state) => state.queue[currentIndex]?.trackId);

  const artistQuery = useQuery({
    queryKey: ['catalog', 'artist', id],
    queryFn: () => apiClient.catalog.getArtist(id),
  });
  const albumsQuery = useQuery({
    queryKey: ['catalog', 'artist', id, 'albums'],
    queryFn: () => apiClient.catalog.getArtistAlbums(id),
  });
  const tracksQuery = useQuery({
    queryKey: ['catalog', 'artist', id, 'tracks'],
    queryFn: () => apiClient.catalog.getArtistTracks(id),
  });

  const isFollowed = useIsArtistFollowed(id);
  const toggleSavedArtist = useToggleSavedArtist();

  const artist = artistQuery.data;
  const albums = albumsQuery.data ?? [];
  const topTracks = (tracksQuery.data ?? []).slice(0, 10);

  const playTrack = async (index: number) => {
    const { queue, startIndex } = await buildResolvedQueue(topTracks, index, artistNames);
    await load(queue, startIndex);
  };

  const isLoading = artistQuery.isLoading;
  const isError = artistQuery.isError;

  return (
    <Surface style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header variant="detail" title={artist?.name ?? 'Artist'} onBackPress={() => router.back()} />

        {isLoading ? (
          <VStack gap="lg" style={styles.content}>
            <Skeleton width={120} height={120} radius="full" style={styles.centerSelf} />
            <SkeletonRow />
            <SkeletonRow />
          </VStack>
        ) : isError ? (
          <ErrorState description="Could not load this artist." onRetry={() => void artistQuery.refetch()} />
        ) : artist ? (
          <FlatList
            data={albums}
            keyExtractor={(album) => album.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            ListHeaderComponent={
              <VStack gap="lg" style={styles.headerStack}>
                <VStack align="center" gap="sm">
                  <Avatar source={artist.avatarUrl} initials={artist.name} size="lg" />
                  <Text variant="title" style={styles.centerText}>
                    {artist.name}
                  </Text>
                  <IconButton
                    name={isFollowed ? 'user-check' : 'user-plus'}
                    accessibilityLabel={isFollowed ? 'Unfollow' : 'Follow'}
                    color={isFollowed ? 'accent' : 'textSecondary'}
                    onPress={() => toggleSavedArtist.mutate({ artist, isFollowed })}
                  />
                </VStack>

                {topTracks.length > 0 ? (
                  <VStack gap="sm">
                    <Text variant="bodyStrong">Top songs</Text>
                    <VStack gap="sm">
                      {topTracks.map((track, index) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          artistName={artist.name}
                          isPlaying={track.id === currentTrackId}
                          onPress={() => void playTrack(index)}
                        />
                      ))}
                    </VStack>
                  </VStack>
                ) : null}

                {albums.length > 0 ? <Text variant="bodyStrong">Albums</Text> : null}
              </VStack>
            }
            ListEmptyComponent={
              !tracksQuery.isLoading && topTracks.length === 0 ? (
                <EmptyState icon="disc" title="Nothing here yet" description="This artist has no cached albums or tracks." />
              ) : null
            }
            renderItem={({ item }: { item: Album }) => (
              <AlbumCard album={item} style={styles.gridCard} onPress={() => router.push(`/album/${item.id}`)} />
            )}
            ItemSeparatorComponent={() => <VStack gap="sm" />}
          />
        ) : null}

        <MiniPlayer onExpand={() => router.push('/player')} />
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerSelf: {
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
  },
  headerStack: {
    paddingBottom: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  gridRow: {
    gap: 12,
  },
  gridCard: {
    flex: 1,
  },
});
