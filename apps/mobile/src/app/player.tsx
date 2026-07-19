import {
  ContextMenu,
  type ContextMenuItem,
  EqualizerGlyph,
  HStack,
  Icon,
  IconButton,
  PressableScale,
  ProgressSeekBar,
  Slider,
  Surface,
  Text,
  VStack,
} from '@music-app/design-system';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import { QueueSheet } from '@/components/queue-sheet';
import { SleepTimerSheet } from '@/components/sleep-timer-sheet';
import { MaxContentWidth } from '@/constants/layout';
import { formatDuration } from '@/lib/format';
import { useTrackLiked } from '@/hooks/use-track-liked';
import { usePlaybackStore } from '@/stores/playback-store';
import { useSleepTimerStore } from '@/stores/sleep-timer-store';

/**
 * The Full Player — "Header(BackArrow, MoreIcon, CastIcon) ->
 * PlayerArt(Standard Card) -> PlayerControls_ProgressBar ->
 * SongInfo(H3_Title, Body2_Subtitle) -> VolumeControl_ContextMenuActions"
 * per docs/design/design-system-specification.md's Screen Architecture,
 * cross-referenced against the approved UI board's "PLAYER Refinements"
 * crop (dimmed/blurred artwork backdrop; prev/rewind - play(large,
 * filled) - next/forward transport row; small icon-button groups
 * flanking the transport row). The board's own crop doesn't show the
 * artwork card, title, or progress bar directly (obscured by the Sleep
 * Timer overlay in that mockup) — those are built from the design
 * system's own token set (radius_xxl card, standard type scale) plus
 * this app's existing `MiniPlayer`/`ProgressSeekBar` visual language,
 * per "if the visible mockup is incomplete, use the approved design
 * system together with the visible UI board."
 *
 * A modal route (`presentation: 'modal'`, see (tabs)/_layout.tsx's
 * push site) rather than living inside a tab — matches
 * design-system-specification.md's Navigation Flow ("Home -> Album
 * Detail -> Full Player (Pushes... mini-player expands)").
 */
export default function PlayerScreen() {
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const queue = usePlaybackStore((state) => state.queue);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const status = usePlaybackStore((state) => state.status);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const repeatMode = usePlaybackStore((state) => state.repeatMode);
  const shuffleEnabled = usePlaybackStore((state) => state.shuffleEnabled);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const seekTo = usePlaybackStore((state) => state.seekTo);
  const skipToNext = usePlaybackStore((state) => state.skipToNext);
  const skipToPrevious = usePlaybackStore((state) => state.skipToPrevious);
  const cycleRepeatMode = usePlaybackStore((state) => state.cycleRepeatMode);
  const setShuffleEnabled = usePlaybackStore((state) => state.setShuffleEnabled);
  const volume = usePlaybackStore((state) => state.volume);
  const setVolume = usePlaybackStore((state) => state.setVolume);
  const reorderQueue = usePlaybackStore((state) => state.reorderQueue);
  const load = usePlaybackStore((state) => state.load);

  const currentItem = currentIndex >= 0 ? queue[currentIndex] : undefined;
  const { isLiked, toggle: toggleLiked } = useTrackLiked(currentItem?.trackId);
  const isSleepTimerSheetVisible = useSleepTimerStore((state) => state.isSheetVisible);
  const sleepTimerMinutesRemaining = useSleepTimerStore((state) => state.minutesRemaining);
  const showSleepTimerSheet = useSleepTimerStore((state) => state.showSheet);
  const hideSleepTimerSheet = useSleepTimerStore((state) => state.hideSheet);
  const setSleepTimer = useSleepTimerStore((state) => state.set);
  const cancelSleepTimer = useSleepTimerStore((state) => state.cancel);

  if (!currentItem) {
    // Reaching /player with no active queue (e.g. a stale deep link, or
    // the queue having been cleared by a `stop()` elsewhere) — there is
    // nothing to render a player for, so this route is a no-op rather
    // than a broken-looking screen.
    router.back();
    return null;
  }

  const isPlaying = status === 'playing';
  const isBuffering = status === 'buffering' || status === 'loading';
  const progress = currentItem.durationMs > 0 ? positionMs / currentItem.durationMs : 0;

  const menuItems: ContextMenuItem[] = [
    {
      key: 'lyrics',
      label: 'Lyrics',
      icon: 'mic',
      onPress: () => router.push('/lyrics'),
    },
    {
      key: 'sleep-timer',
      label: sleepTimerMinutesRemaining !== null ? 'Sleep timer (active)' : 'Sleep timer',
      icon: 'moon',
      onPress: () => showSleepTimerSheet(),
    },
    {
      key: 'share',
      label: 'Share',
      icon: 'share-2',
      onPress: () => {
        void Share.share({
          message: currentItem.artistName
            ? `${currentItem.title} — ${currentItem.artistName}, on Eniza`
            : `${currentItem.title}, on Eniza`,
        });
      },
    },
  ];

  return (
    <Surface style={styles.root}>
      <Image
        source={currentItem.artworkUrl ?? undefined}
        style={styles.backdropImage}
        blurRadius={40}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.94)']}
        style={styles.backdropGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <Header
          variant="detail"
          title="Now Playing"
          onBackPress={() => router.back()}
          onActionPress={() => setIsMenuVisible(true)}
          actionAccessibilityLabel="More options"
        />

        <VStack align="center" gap="xl" style={styles.content}>
          <Surface radius="xxl" elevation="floating" style={styles.artworkCard}>
            <Image
              source={currentItem.artworkUrl ?? undefined}
              style={styles.artwork}
              contentFit="cover"
              transition={200}
            />
          </Surface>

          <VStack align="center" gap="xs" style={styles.songInfo}>
            <Text variant="title" numberOfLines={1} style={styles.centerText}>
              {currentItem.title}
            </Text>
            {currentItem.artistName ? (
              <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.centerText}>
                {currentItem.artistName}
              </Text>
            ) : null}
          </VStack>

          <VStack gap="xs" style={styles.progressColumn}>
            <ProgressSeekBar
              progress={progress}
              onSeek={(ratio) => void seekTo(ratio * currentItem.durationMs)}
            />
            <HStack justify="space-between">
              <Text variant="caption" color="textTertiary">
                {formatDuration(positionMs / 1000)}
              </Text>
              <Text variant="caption" color="textTertiary">
                {formatDuration(currentItem.durationMs / 1000)}
              </Text>
            </HStack>
          </VStack>

          <HStack align="center" justify="space-between" style={styles.transportRow}>
            <IconButton
              name="shuffle"
              accessibilityLabel={shuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
              color={shuffleEnabled ? 'accent' : 'textSecondary'}
              onPress={() => void setShuffleEnabled(!shuffleEnabled)}
            />
            <HStack align="center" gap="lg">
              <IconButton
                name="skip-back"
                size="lg"
                accessibilityLabel="Previous"
                onPress={() => void skipToPrevious()}
              />
              <PressableScale
                scaleTo={0.94}
                onPress={() => void (isPlaying ? pause() : play())}
                disabled={isBuffering}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
                <Surface color="accent" radius="full" style={styles.playButton}>
                  {isBuffering ? (
                    <EqualizerGlyph color="textOnAccent" animated size={22} />
                  ) : (
                    <Icon name={isPlaying ? 'pause' : 'play'} size="lg" color="textOnAccent" />
                  )}
                </Surface>
              </PressableScale>
              <IconButton
                name="skip-forward"
                size="lg"
                accessibilityLabel="Next"
                onPress={() => void skipToNext()}
              />
            </HStack>
            <PressableScale
              scaleTo={0.9}
              onPress={() => void cycleRepeatMode()}
              accessibilityRole="button"
              accessibilityLabel={
                repeatMode === 'off'
                  ? 'Enable repeat'
                  : repeatMode === 'all'
                    ? 'Repeat all (tap to repeat one)'
                    : 'Repeat one (tap to disable)'
              }
              style={styles.repeatButton}>
              {/* Feather has no distinct "repeat-one" glyph — the small
                  "1" badge below is what disambiguates that state from
                  plain "repeat all", not the icon itself. */}
              <Icon name="repeat" size="md" color={repeatMode === 'off' ? 'textSecondary' : 'accent'} />
              {repeatMode === 'one' ? (
                <Text variant="caption" color="accent" style={styles.repeatOneBadge}>
                  1
                </Text>
              ) : null}
            </PressableScale>
          </HStack>

          <HStack align="center" gap="sm" style={styles.volumeRow}>
            <Icon name="volume-1" size="sm" color="textSecondary" accessibilityLabel="Volume" />
            <VStack style={styles.volumeSliderWrapper}>
              <Slider value={volume} onValueChange={(next) => void setVolume(next)} />
            </VStack>
            <Icon name="volume-2" size="sm" color="textSecondary" />
          </HStack>

          <HStack align="center" justify="space-between" style={styles.secondaryRow}>
            <IconButton
              name="heart"
              accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
              color={isLiked ? 'accent' : 'textSecondary'}
              onPress={toggleLiked}
            />
            <IconButton
              name="list"
              accessibilityLabel="View queue"
              onPress={() => setIsQueueVisible(true)}
            />
          </HStack>
        </VStack>
      </SafeAreaView>

      <ContextMenu visible={isMenuVisible} items={menuItems} onDismiss={() => setIsMenuVisible(false)} />

      <SleepTimerSheet
        visible={isSleepTimerSheetVisible}
        activeMinutesRemaining={sleepTimerMinutesRemaining}
        onSet={(minutes) => setSleepTimer(minutes, () => void pause())}
        onCancel={() => cancelSleepTimer()}
        onDismiss={() => hideSleepTimerSheet()}
      />

      <QueueSheet
        visible={isQueueVisible}
        queue={queue}
        currentIndex={currentIndex}
        onReorder={(fromIndex, toIndex) => void reorderQueue(fromIndex, toIndex)}
        onSelectIndex={(index) => void load(queue, index)}
        onDismiss={() => setIsQueueVisible(false)}
      />
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
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  artworkCard: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  songInfo: {
    width: '100%',
  },
  centerText: {
    textAlign: 'center',
  },
  progressColumn: {
    width: '100%',
  },
  transportRow: {
    width: '100%',
  },
  playButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 9,
  },
  volumeRow: {
    width: '100%',
    paddingHorizontal: 24,
  },
  volumeSliderWrapper: {
    flex: 1,
  },
  secondaryRow: {
    width: '100%',
    paddingHorizontal: 24,
  },
});
