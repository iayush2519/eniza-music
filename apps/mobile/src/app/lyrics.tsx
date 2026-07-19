import { EmptyState, Surface, VStack } from '@music-app/design-system';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import { MaxContentWidth } from '@/constants/layout';
import { usePlaybackStore } from '@/stores/playback-store';

/**
 * "Lyrics screen (synchronized if available, otherwise graceful
 * fallback)" per Phase 5's scope — "Header(BackArrow) -> LargeArtwork
 * (Blurred Background) -> CenteredLyricText" per
 * docs/design/design-system-specification.md's Screen Architecture.
 *
 * No lyrics data exists anywhere in this app: `Track` (see
 * @music-app/shared-types) has no lyrics field, no lyrics endpoint
 * exists on the backend, and no third-party lyrics provider is
 * integrated — adding one would mean a new external dependency (and
 * likely a paid API), which is a decision flagged for explicit sign-off
 * rather than added silently. This screen therefore always renders the
 * graceful-fallback branch the objective explicitly allows for; the
 * blurred-artwork backdrop and header match the board/spec regardless of
 * which branch renders, so wiring in real lyrics later only replaces the
 * `EmptyState` in the body with the actual synchronized text view.
 */
export default function LyricsScreen() {
  const queue = usePlaybackStore((state) => state.queue);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const currentItem = currentIndex >= 0 ? queue[currentIndex] : undefined;

  return (
    <Surface style={styles.root}>
      <Image
        source={currentItem?.artworkUrl ?? undefined}
        style={styles.backdropImage}
        blurRadius={50}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.96)']}
        style={styles.backdropGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <Header variant="detail" title="Lyrics" onBackPress={() => router.back()} />

        <VStack align="center" justify="center" style={styles.content}>
          <EmptyState
            icon="mic-off"
            title="No lyrics available"
            description={
              currentItem
                ? `We couldn't find lyrics for "${currentItem.title}".`
                : 'Play a track to see its lyrics here.'
            }
          />
        </VStack>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropImage: {
    ...StyleSheet.absoluteFill,
  },
  backdropGradient: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
