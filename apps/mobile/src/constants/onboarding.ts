import type { IconName } from '@music-app/design-system';

export type OnboardingSlide = {
  key: string;
  icon: IconName;
  title: string;
  description: string;
};

/**
 * Onboarding content, kept as data rather than hardcoded inside the
 * screen — this is what lets the slide count, copy, or icon change
 * without touching any layout or animation logic in `onboarding.tsx`.
 */
export const onboardingSlides: OnboardingSlide[] = [
  {
    key: 'discover',
    icon: 'compass',
    title: 'Music that\nactually gets you',
    description: 'Every recommendation is shaped by what you play, not by what everyone else is streaming.',
  },
  {
    key: 'curated',
    icon: 'layers',
    title: 'Playlists worth\ncoming back to',
    description: 'Mixes and mood-based collections that feel handpicked, because they are.',
  },
  {
    key: 'everywhere',
    icon: 'radio',
    title: 'Your sound,\nwherever you go',
    description: 'Pick up exactly where you left off, on any device, any time.',
  },
];
