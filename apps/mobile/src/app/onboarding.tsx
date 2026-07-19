import { Button, Surface, Text } from '@music-app/design-system';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingSlide } from '@/components/onboarding-slide';
import { ProgressDots } from '@/components/progress-dots';
import { onboardingSlides } from '@/constants/onboarding';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * First-launch product introduction, shown once per install before a
 * logged-out user reaches (auth) — see `_layout.tsx`'s guard ordering.
 * A horizontally-paged flow (not a `Stack`/multi-route flow) because
 * onboarding has no back-navigation, deep-linking, or independent-screen
 * needs; a single scroll view keeps the swipe gesture free and avoids
 * the overhead of a router transition per slide.
 */
export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const complete = useOnboardingStore((state) => state.complete);
  const [pageIndex, setPageIndex] = useState(0);
  const scrollProgress = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const isLastSlide = pageIndex === onboardingSlides.length - 1;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollProgress.value = event.contentOffset.x / width;
    },
  });

  const handleMomentumScrollEnd = (offsetX: number) => {
    setPageIndex(Math.round(offsetX / width));
  };

  const handleNext = () => {
    if (isLastSlide) {
      void handleGetStarted();
      return;
    }
    const nextIndex = pageIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setPageIndex(nextIndex);
  };

  const handleGetStarted = async () => {
    await complete();
    router.replace('/(auth)/login');
  };

  return (
    <Surface style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          onPress={handleGetStarted}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding">
          <Text variant="label" color="textSecondary">
            Skip
          </Text>
        </Pressable>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => handleMomentumScrollEnd(event.nativeEvent.contentOffset.x)}
          style={styles.pager}>
          {onboardingSlides.map((slide) => (
            <OnboardingSlide
              key={slide.key}
              icon={slide.icon}
              title={slide.title}
              description={slide.description}
            />
          ))}
        </Animated.ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <ProgressDots count={onboardingSlides.length} progress={scrollProgress} />

          <Button onPress={handleNext} style={styles.nextButton}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Button>
        </SafeAreaView>
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
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pager: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  nextButton: {
    width: '100%',
  },
});
