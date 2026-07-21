'use client';

import { Heart, Home, Library, ListMusic, Pause, Search, Settings, SkipBack, SkipForward } from 'lucide-react';
import { useState } from 'react';

import { Container } from '@/components/ui/container';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';

type PreviewScreen = 'home' | 'search' | 'player' | 'playlist' | 'library' | 'settings';

const TABS: { id: PreviewScreen; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'player', label: 'Player', icon: ListMusic },
  { id: 'playlist', label: 'Playlist', icon: Library },
  { id: 'library', label: 'Library', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * "App preview" built entirely from layout/CSS inside a phone-shaped
 * frame — deliberately not a fabricated screenshot. This project has no
 * shipped mobile app screens to screenshot honestly, and inventing fake
 * ones would misrepresent the product to visitors/investors. The frame
 * itself communicates the intended shape of the product; each tab swaps
 * the frame's content via simple layout blocks that echo the section
 * name (rows for a list, a big artwork block for the player, etc.).
 */
export function ProductPreviewSection() {
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>('home');

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Product Preview"
            title="Designed to feel effortless"
            description="A calm, focused interface across every screen — home, search, player, playlists, library, and settings."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-14 flex flex-col items-center gap-8">
          <div className="flex flex-wrap justify-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveScreen(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2 text-sm transition-colors',
                  activeScreen === tab.id
                    ? 'glass text-[var(--color-foreground)]'
                    : 'text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground-muted)]',
                )}
              >
                <tab.icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </button>
            ))}
          </div>

          <PhoneFrame screen={activeScreen} />
        </Reveal>
      </Container>
    </section>
  );
}

function PhoneFrame({ screen }: { screen: PreviewScreen }) {
  return (
    <div className="glass relative h-[560px] w-[280px] rounded-[2.5rem] p-3 shadow-[var(--shadow-glow-blush)]">
      <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-black/40" />
      <div className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-[var(--color-background)] pt-8">
        <div className="flex-1 overflow-hidden px-4">
          <ScreenContent screen={screen} />
        </div>
        <div className="flex items-center justify-around border-t border-[var(--color-border)] px-4 py-3">
          {TABS.slice(0, 4).map((tab) => (
            <tab.icon
              key={tab.id}
              className={cn(
                'h-4 w-4',
                tab.id === screen
                  ? 'text-[var(--color-accent-rose)]'
                  : 'text-[var(--color-foreground-subtle)]',
              )}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenContent({ screen }: { screen: PreviewScreen }) {
  switch (screen) {
    case 'home':
      return (
        <div className="flex flex-col gap-3 py-4">
          <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-subtle)]">
            Good evening
          </p>
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="glass flex items-center gap-3 rounded-[var(--radius-md)] p-2.5">
              <div className="h-9 w-9 flex-shrink-0 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-accent-blush)] to-[var(--color-accent-violet)]" />
              <div className="h-2 w-24 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      );
    case 'search':
      return (
        <div className="flex flex-col gap-3 py-4">
          <div className="glass flex items-center gap-2 rounded-[var(--radius-pill)] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[var(--color-foreground-subtle)]" aria-hidden />
            <div className="h-2 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((tile) => (
              <div
                key={tile}
                className="aspect-square rounded-[var(--radius-md)] bg-gradient-to-br from-white/10 to-white/[0.02]"
              />
            ))}
          </div>
        </div>
      );
    case 'player':
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 py-4">
          <div className="h-40 w-40 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-accent-blush)] via-[var(--color-accent-rose)] to-[var(--color-accent-violet)]" />
          <div className="w-full text-center">
            <div className="mx-auto h-2 w-32 rounded-full bg-white/15" />
            <div className="mx-auto mt-2 h-2 w-20 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-6">
            <SkipBack className="h-4 w-4 text-[var(--color-foreground-muted)]" aria-hidden />
            <div className="glass flex h-11 w-11 items-center justify-center rounded-full">
              <Pause className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden />
            </div>
            <SkipForward className="h-4 w-4 text-[var(--color-foreground-muted)]" aria-hidden />
          </div>
        </div>
      );
    case 'playlist':
      return (
        <div className="flex flex-col gap-3 py-4">
          <div className="mx-auto h-20 w-20 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent-violet)] to-[var(--color-accent-blush)]" />
          <div className="mx-auto h-2 w-28 rounded-full bg-white/15" />
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 px-1 py-2">
              <div className="h-2 w-2 rounded-full bg-[var(--color-accent-rose)]" />
              <div className="h-2 w-32 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      );
    case 'library':
      return (
        <div className="grid grid-cols-2 gap-2 py-4">
          {[1, 2, 3, 4, 5, 6].map((tile) => (
            <div
              key={tile}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white/[0.04]"
            >
              <Heart className="h-4 w-4 text-[var(--color-accent-rose)]" aria-hidden />
            </div>
          ))}
        </div>
      );
    case 'settings':
      return (
        <div className="flex flex-col gap-3 py-4">
          {['Account', 'Playback', 'Notifications', 'Downloads', 'About'].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-[var(--radius-md)] px-1 py-3"
            >
              <span className="text-xs text-[var(--color-foreground-muted)]">{label}</span>
              <div className="h-1.5 w-4 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
