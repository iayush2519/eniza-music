import {
  Cloud,
  Download,
  Headphones,
  Mic2,
  RadioTower,
  Search,
  Smartphone,
  Sparkles,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { Container } from '@/components/ui/container';
import { GlassCard } from '@/components/ui/glass-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI Playlist Generator',
    description: 'Describe a mood or moment and get a complete playlist, generated instantly.',
  },
  {
    icon: Search,
    title: 'Smart Music Search',
    description: 'Search using natural language — no need to know the exact title or artist.',
  },
  {
    icon: Download,
    title: 'Offline Listening',
    description: 'Download songs and playlists to listen without an internet connection.',
  },
  {
    icon: Smartphone,
    title: 'Cross Platform Sync',
    description: 'Pick up exactly where you left off, on any device you sign into.',
  },
  {
    icon: Waves,
    title: 'High Quality Audio',
    description: 'Studio-quality streaming, tuned automatically for your connection.',
  },
  {
    icon: RadioTower,
    title: 'Artist Discovery',
    description: 'Surface new and independent artists matched to your actual taste.',
  },
  {
    icon: Mic2,
    title: 'Lyrics',
    description: 'Synced lyrics for sing-alongs, translations, and deeper listening.',
  },
  {
    icon: Cloud,
    title: 'Cloud Library',
    description: 'Every playlist and saved track backed up and available everywhere.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Streaming',
    description: 'Near-instant playback start, even on slower networks.',
  },
  {
    icon: Headphones,
    title: 'Beautiful Player',
    description: 'A calm, focused now-playing screen designed to stay out of your way.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to listen better"
            description="ENIZA brings together intelligent discovery and a fast, distraction-free player — built for how people actually listen today."
          />
        </Reveal>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={Math.min(index * 0.05, 0.3)}>
              <GlassCard interactive className="h-full">
                <feature.icon className="h-6 w-6 text-[var(--color-accent-rose)]" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {feature.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
