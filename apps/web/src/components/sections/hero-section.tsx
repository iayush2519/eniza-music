'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Pill } from '@/components/ui/pill';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const FLOATING_CARDS = [
  { title: 'Late Night Coding', subtitle: 'AI Playlist · 42 tracks', offset: '-left-4 top-10 sm:-left-10' },
  { title: 'Believer — Imagine Dragons', subtitle: 'Now Playing', offset: '-right-2 top-32 sm:-right-8' },
  { title: 'Road Trip Anthems', subtitle: 'AI Playlist · 58 tracks', offset: 'left-6 bottom-6 sm:left-0' },
];

/**
 * Hero: headline, subtext, dual CTAs, and a floating glass "app preview"
 * built from CSS/DOM (no fabricated product screenshots — see
 * ProductPreviewSection for the same constraint applied to the mockups
 * section). Background is an animated gradient glow, not an image, so it
 * scales losslessly and costs nothing to load.
 */
export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32">
      <BackgroundGlow />

      <Container className="relative flex flex-col items-center text-center">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Pill icon={Sparkles}>AI-Powered Music Platform</Pill>
        </motion.div>

        <motion.h1
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl"
        >
          The AI-Powered <span className="text-gradient-brand">Music Platform</span>
        </motion.h1>

        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-[var(--color-foreground-muted)] sm:text-xl"
        >
          Discover, stream and organize music using intelligent recommendations, AI-generated
          playlists and a seamless listening experience.
        </motion.p>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button href="#waitlist" size="lg">
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button href="#waitlist" variant="secondary" size="lg">
            <Play className="h-4 w-4" aria-hidden />
            Join Waitlist
          </Button>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative mt-24 w-full max-w-3xl"
        >
          <HeroDeviceMock />
          {FLOATING_CARDS.map((card, index) => (
            <motion.div
              key={card.title}
              className={`glass absolute hidden w-56 rounded-[var(--radius-lg)] p-4 text-left sm:block ${card.offset}`}
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: 1, scale: 1, y: [0, -10, 0] }
              }
              transition={{
                opacity: { duration: 0.5, delay: 0.6 + index * 0.15 },
                scale: { duration: 0.5, delay: 0.6 + index * 0.15 },
                y: { duration: 4 + index, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                {card.title}
              </p>
              <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">{card.subtitle}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

function BackgroundGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute left-1/2 top-[-10%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[var(--color-accent-blush)]/25 blur-[120px]" />
      <div className="absolute right-[8%] top-[20%] h-[380px] w-[380px] rounded-full bg-[var(--color-accent-violet)]/20 blur-[120px]" />
    </div>
  );
}

/** Stylized "now playing" mockup, entirely CSS/SVG-driven glassmorphism —
 * not a fabricated screenshot of a mobile app that doesn't visually
 * exist for this marketing site. */
function HeroDeviceMock() {
  return (
    <div className="glass mx-auto flex w-full max-w-md flex-col gap-6 rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-glow-blush)] sm:p-8">
      <div className="flex items-center gap-3">
        <Image
          src="/branding/eniza-logo-white.png"
          alt="ENIZA Music"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full"
        />
        <div className="text-left">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Now Playing</p>
          <p className="text-xs text-[var(--color-foreground-subtle)]">From your AI mix</p>
        </div>
      </div>

      <div className="aspect-square w-full rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-accent-blush)] via-[var(--color-accent-rose)] to-[var(--color-accent-violet)]" />

      <div className="text-left">
        <p className="text-base font-semibold text-[var(--color-foreground)]">Midnight Frequencies</p>
        <p className="text-sm text-[var(--color-foreground-subtle)]">ENIZA AI Mix</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div className="h-1.5 w-2/3 rounded-full bg-gradient-to-r from-[var(--color-accent-blush)] to-[var(--color-accent-rose)]" />
        </div>
        <div className="flex justify-between text-xs text-[var(--color-foreground-subtle)]">
          <span>2:14</span>
          <span>3:42</span>
        </div>
      </div>
    </div>
  );
}
