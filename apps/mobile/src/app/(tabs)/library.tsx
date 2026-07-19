import { Button, EmptyState, ErrorState, HStack, SegmentedControl, Skeleton, Surface, Text, VStack } from '@music-app/design-system';
import type { Album, Artist, Playlist } from '@music-app/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album-card';
import { ArtistCard } from '@/components/artist-card';
import { MiniPlayer } from '@/components/mini-player';
import { PlaylistCard } from '@/components/playlist-card';
import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { apiClient } from '@/lib/api-client';
import { useSavedAlbums, useSavedArtists } from '@/hooks/use-saved-entities';
import { useAuthStore } from '@/stores/auth-store';

const SEGMENTS = ['Playlists', 'Albums', 'Artists'] as const;
type Segment = (typeof SEGMENTS)[number];

/**
 * The signed-in user's saved content — "LIBRARY Screen (Tab 3)" per
 * docs/design/design-system-specification.md's screen architecture:
 * `Header -> SegmentedControl(Playlists/Albums/Artists) -> ContentArea`.
 * This screen only exists inside the `(tabs)` group, which
 * `Stack.Protected` in the root layout only shows once `isAuthenticated`
 * is true (see apps/mobile/src/app/_layout.tsx), so `LibraryClient`
 * always has a valid session to call with.
 *
 * Playlist creation/editing is deferred (Phase 3/Authentication is the
 * current phase's scope; playlist management is a later Phase 6/Library
 * milestone per docs/design/design-system-specification.md §6) — this
 * screen covers browsing all three saved-content segments the spec
 * names, not yet creating/editing any of them.
 */
export default function LibraryScreen() {
  const [segment, setSegment] = useState<Segment>('Playlists');
  const displayName = useAuthStore((state) => state.user?.displayName);
  const logout = useAuthStore((state) => state.logout);

  const playlistsQuery = useQuery({
    queryKey: ['library', 'playlists'],
    queryFn: () => apiClient.library.listPlaylists(),
  });
  const albumsQuery = useSavedAlbums();
  const artistsQuery = useSavedArtists();

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <VStack gap="md" style={styles.header}>
          <HStack justify="space-between" align="center">
            <Text variant="title">Library</Text>
            {/* No dedicated account/settings screen exists yet (Phase 10
                covers Settings) — logout lives here for now since
                Library is the one screen that only renders for a
                signed-in user. */}
            <Button variant="ghost" onPress={() => void logout()}>
              Log out
            </Button>
          </HStack>
          {displayName ? (
            <Text variant="label" color="textSecondary">
              Signed in as {displayName}
            </Text>
          ) : null}
          <SegmentedControl segments={SEGMENTS} value={segment} onChange={setSegment} />
        </VStack>

        {segment === 'Playlists' ? (
          <FlatList<Playlist>
            data={playlistsQuery.data ?? []}
            keyExtractor={(playlist) => playlist.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <LibraryEmptyState
                query={playlistsQuery}
                icon="list"
                emptyTitle="No playlists yet"
                emptyDescription="Playlists you create will show up here."
              />
            }
            renderItem={({ item }) => (
              <PlaylistCard playlist={item} onPress={() => router.push(`/playlist/${item.id}`)} />
            )}
            ItemSeparatorComponent={() => <VStack gap="sm" />}
          />
        ) : segment === 'Albums' ? (
          <FlatList<Album>
            data={albumsQuery.data ?? []}
            keyExtractor={(album) => album.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <LibraryEmptyState
                query={albumsQuery}
                icon="disc"
                emptyTitle="No saved albums"
                emptyDescription="Albums you save will show up here."
              />
            }
            renderItem={({ item }) => (
              <AlbumCard album={item} style={styles.gridCard} onPress={() => router.push(`/album/${item.id}`)} />
            )}
            ItemSeparatorComponent={() => <VStack gap="sm" />}
          />
        ) : (
          <FlatList<Artist>
            data={artistsQuery.data ?? []}
            keyExtractor={(artist) => artist.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <LibraryEmptyState
                query={artistsQuery}
                icon="mic"
                emptyTitle="No saved artists"
                emptyDescription="Artists you follow will show up here."
              />
            }
            renderItem={({ item }) => (
              <ArtistCard artist={item} onPress={() => router.push(`/artist/${item.id}`)} />
            )}
            ItemSeparatorComponent={() => <VStack gap="sm" />}
          />
        )}
        <MiniPlayer onExpand={() => router.push('/player')} />
      </SafeAreaView>
    </Surface>
  );
}

function LibraryEmptyState({
  query,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  query: UseQueryResult<unknown>;
  icon: 'list' | 'disc' | 'mic';
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (query.isLoading) {
    return (
      <VStack gap="sm">
        <Skeleton width="100%" height={56} radius="xl" />
        <Skeleton width="100%" height={56} radius="xl" />
      </VStack>
    );
  }
  if (query.isError) {
    return <ErrorState description="Could not load your library." onRetry={() => void query.refetch()} />;
  }
  return <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />;
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset + 16,
  },
  gridRow: {
    gap: 12,
  },
  gridCard: {
    flex: 1,
  },
});
