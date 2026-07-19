import { Button, EmptyState, ErrorState, HStack, Skeleton, SkeletonRow, Surface, Text, VStack } from '@music-app/design-system';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import { MiniPlayer } from '@/components/mini-player';
import { TrackRow } from '@/components/track-row';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { useArtistNameMap } from '@/hooks/use-artist-name-map';
import { apiClient } from '@/lib/api-client';
import { buildResolvedQueue } from '@/lib/play-queue';
import { usePlaybackStore } from '@/stores/playback-store';

/**
 * "Playlist details" per Phase 5's scope. Backed by
 * `GET /library/playlists/:id` (apps/api/src/library/
 * library.controller.ts), which already returns the playlist plus its
 * full track list in one call (`PlaylistWithTracks`) — no extra
 * requests needed the way Album/Artist Detail need a second call for
 * their tracks. Mirrors Album Detail's exact layout (cover-surrogate,
 * title/description, Play action, track list) since playlists have no
 * distinct approved mockup of their own beyond the shared "SongListView
 * (Rounded Cell Items, ContextMenu)" pattern
 * docs/design/design-system-specification.md names for every MUSIC view.
 */
export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistNames = useArtistNameMap();
  const load = usePlaybackStore((state) => state.load);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentTrackId = usePlaybackStore((state) => state.queue[currentIndex]?.trackId);

  const playlistQuery = useQuery({
    queryKey: ['library', 'playlist', id],
    queryFn: () => apiClient.library.getPlaylist(id),
  });

  const playlist = playlistQuery.data;
  const tracks = playlist?.tracks ?? [];

  const playTrack = async (index: number) => {
    const { queue, startIndex } = await buildResolvedQueue(tracks, index, artistNames);
    await load(queue, startIndex);
  };

  return (
    <Surface style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          variant="detail"
          title={playlist?.title ?? 'Playlist'}
          onBackPress={() => router.back()}
          onActionPress={
            playlist
              ? () => void Share.share({ message: `${playlist.title}, a playlist on Eniza` })
              : undefined
          }
          actionAccessibilityLabel="Share playlist"
        />

        {playlistQuery.isLoading ? (
          <VStack gap="lg" style={styles.content}>
            <Skeleton width="100%" height={200} radius="xxl" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </VStack>
        ) : playlistQuery.isError ? (
          <ErrorState description="Could not load this playlist." onRetry={() => void playlistQuery.refetch()} />
        ) : playlist ? (
          <FlatList
            data={tracks}
            keyExtractor={(track) => track.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <VStack align="center" gap="md" style={styles.headerStack}>
                <Surface color="accentMuted" radius="xxl" elevation="floating" style={styles.coverFallback}>
                  <Text variant="displayMedium" color="accent">
                    {playlist.title.slice(0, 1).toUpperCase()}
                  </Text>
                </Surface>
                <VStack align="center" gap="xs">
                  <Text variant="title" numberOfLines={2} style={styles.centerText}>
                    {playlist.title}
                  </Text>
                  {playlist.description ? (
                    <Text variant="body" color="textSecondary" style={styles.centerText}>
                      {playlist.description}
                    </Text>
                  ) : null}
                  <Text variant="label" color="textTertiary">
                    {tracks.length} track{tracks.length === 1 ? '' : 's'}
                  </Text>
                </VStack>
                {tracks.length > 0 ? (
                  <HStack gap="sm" style={styles.actionsRow}>
                    <Button style={styles.playAllButton} onPress={() => void playTrack(0)}>
                      Play
                    </Button>
                  </HStack>
                ) : null}
              </VStack>
            }
            ListEmptyComponent={
              <EmptyState
                icon="music"
                title="No tracks yet"
                description="Add tracks to this playlist to start listening."
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
  },
  headerStack: {
    paddingBottom: 24,
  },
  coverFallback: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  actionsRow: {
    marginTop: 8,
  },
  playAllButton: {
    minWidth: 140,
  },
});
