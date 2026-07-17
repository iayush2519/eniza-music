import { Button, HStack, Surface, Text, VStack } from '@music-app/design-system';
import type { Playlist } from '@music-app/shared-types';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

/**
 * The signed-in user's playlists. This screen only exists inside the
 * `(tabs)` group, which `Stack.Protected` in the root layout only shows
 * once `isAuthenticated` is true (see apps/mobile/src/app/_layout.tsx),
 * so `LibraryClient` always has a valid session to call with.
 *
 * Playlist creation/editing and saved tracks/albums (`LibraryClient.save`/
 * `listSaved`) are deferred — this screen covers the "showing real
 * authenticated user data" requirement for this phase; the creation UI
 * is a natural follow-up once there's a player to add tracks from
 * (Phase 5).
 */
export default function LibraryScreen() {
  const displayName = useAuthStore((state) => state.user?.displayName);
  const logout = useAuthStore((state) => state.logout);

  const playlistsQuery = useQuery({
    queryKey: ['library', 'playlists'],
    queryFn: () => apiClient.library.listPlaylists(),
  });

  return (
    <Surface style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList<Playlist>
          data={playlistsQuery.data ?? []}
          keyExtractor={(playlist) => playlist.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <VStack gap="xs" style={styles.header}>
              <HStack justify="space-between" align="center">
                <Text variant="title">Library</Text>
                {/* No dedicated account/settings screen exists yet (Phase 4
                    doesn't call for one) — logout lives here for now since
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
            </VStack>
          }
          ListEmptyComponent={
            <EmptyState isLoading={playlistsQuery.isLoading} isError={playlistsQuery.isError} />
          }
          renderItem={({ item }) => <PlaylistRow playlist={item} />}
          ItemSeparatorComponent={() => <VStack gap="sm" />}
        />
      </SafeAreaView>
    </Surface>
  );
}

function PlaylistRow({ playlist }: { playlist: Playlist }) {
  return (
    <Surface color="surface" radius="md" style={styles.row}>
      <Text variant="bodyStrong" numberOfLines={1}>
        {playlist.title}
      </Text>
      {playlist.description ? (
        <Text variant="label" color="textSecondary" numberOfLines={1}>
          {playlist.description}
        </Text>
      ) : null}
    </Surface>
  );
}

function EmptyState({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return <ActivityIndicator style={styles.centerPad} />;
  }
  return (
    <Text variant="label" color="textSecondary" style={styles.centerPad}>
      {isError ? 'Could not load your library. Pull to refresh.' : 'No playlists yet.'}
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
  row: {
    padding: 16,
    gap: 4,
  },
  centerPad: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
