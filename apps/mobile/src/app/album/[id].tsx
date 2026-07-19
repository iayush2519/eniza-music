import { Button, EmptyState, ErrorState, HStack, Skeleton, SkeletonRow, Surface, Text, VStack } from '@music-app/design-system';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
 * "Album Details" per Phase 5's scope — "Header(BackArrow, MoreIcon) ->
 * ParallaxCoverArt -> H2_Title -> SubTitle(Liner Notes) ->
 * PlaybackButtons -> ContextActions -> SongListView(Rounded Cell Items,
 * ContextMenu)" per docs/design/design-system-specification.md's Screen
 * Architecture. "Liner notes" (album description) has no backing field
 * anywhere (`Album` — see @music-app/shared-types — has no description/
 * bio field), so that subtitle line is the artist name instead, the one
 * piece of subtitle-appropriate text this screen actually has data for.
 *
 * Full parallax-on-scroll for the cover art isn't implemented — the
 * board's crop doesn't show this screen directly, and "parallax" as a
 * scroll-driven artwork effect isn't itself part of Phase 5's named
 * objectives (Full Player, Album/Playlist/Artist Detail, Queue,
 * Mini->Full transition, Lyrics, Sleep Timer, Save/Share) — the static
 * cover-art-then-content layout below matches every other Detail-style
 * screen's structure in this app (Player, Lyrics) rather than
 * introducing a distinct scroll-physics behavior unique to this one
 * screen without a concrete spec for it.
 */
export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistNames = useArtistNameMap();
  const load = usePlaybackStore((state) => state.load);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentTrackId = usePlaybackStore((state) => state.queue[currentIndex]?.trackId);

  const albumQuery = useQuery({
    queryKey: ['catalog', 'album', id],
    queryFn: () => apiClient.catalog.getAlbum(id),
  });
  const tracksQuery = useQuery({
    queryKey: ['catalog', 'album', id, 'tracks'],
    queryFn: () => apiClient.catalog.getAlbumTracks(id),
  });

  const album = albumQuery.data;
  const tracks = tracksQuery.data ?? [];
  const artistName = album ? artistNames.get(album.artistId) : undefined;

  const playTrack = async (index: number) => {
    const { queue, startIndex } = await buildResolvedQueue(tracks, index, artistNames);
    await load(queue, startIndex);
  };

  const isLoading = albumQuery.isLoading || tracksQuery.isLoading;
  const isError = albumQuery.isError || tracksQuery.isError;

  return (
    <Surface style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          variant="detail"
          title={album?.title ?? 'Album'}
          onBackPress={() => router.back()}
          onActionPress={
            album
              ? () =>
                  void Share.share({
                    message: artistName
                      ? `${album.title} — ${artistName}, on Eniza`
                      : `${album.title}, on Eniza`,
                  })
              : undefined
          }
          actionAccessibilityLabel="Share album"
        />

        {isLoading ? (
          <VStack gap="lg" style={styles.content}>
            <Skeleton width="100%" height={240} radius="xxl" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </VStack>
        ) : isError ? (
          <ErrorState
            description="Could not load this album."
            onRetry={() => {
              void albumQuery.refetch();
              void tracksQuery.refetch();
            }}
          />
        ) : album ? (
          <FlatList
            data={tracks}
            keyExtractor={(track) => track.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <VStack align="center" gap="md" style={styles.headerStack}>
                <Surface radius="xxl" elevation="floating" style={styles.coverWrapper}>
                  <Image source={album.coverArtUrl ?? undefined} style={styles.cover} contentFit="cover" />
                </Surface>
                <VStack align="center" gap="xs">
                  <Text variant="title" numberOfLines={2} style={styles.centerText}>
                    {album.title}
                  </Text>
                  {artistName ? (
                    <Text variant="body" color="textSecondary" style={styles.centerText}>
                      {artistName}
                    </Text>
                  ) : null}
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
              <EmptyState icon="music" title="No tracks" description="This album has no tracks yet." />
            }
            renderItem={({ item, index }) => (
              <TrackRow
                track={item}
                artistName={artistName}
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
  coverWrapper: {
    width: 200,
    height: 200,
    overflow: 'hidden',
    marginTop: 8,
  },
  cover: {
    width: '100%',
    height: '100%',
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
