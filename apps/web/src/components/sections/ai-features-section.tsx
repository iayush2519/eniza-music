'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Moon, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Container } from '@/components/ui/container';
import { GlassCard } from '@/components/ui/glass-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const EXAMPLE_PROMPTS = [
  { icon: Moon, text: 'Create a playlist for late-night coding.' },
  { icon: Sparkles, text: 'Recommend songs similar to Believer.' },
  { icon: Wand2, text: 'Play relaxing piano music.' },
  { icon: Dumbbell, text: 'Find songs for gym workouts.' },
  { icon: Sparkles, text: 'Suggest songs based on my mood.' },
  { icon: Moon, text: 'Generate a playlist for road trips.' },
];

/**
 * AI showcase: a simulated chat-style prompt bar cycling through example
 * prompts, plus the same prompts as a card grid below. Purely
 * presentational (no real AI call) — this is a marketing page, not the
 * product itself.
 */
export function AiFeaturesSection() {
  const [activePrompt, setActivePrompt] = useState(0);
  const reduceMotion = useReducedMotion();

  // Auto-cycle through example prompts on a fixed interval, owned by one
  // effect rather than a `setTimeout` chained off each prompt's
  // `onAnimationComplete` — the previous approach queued a new timer
  // every time *any* prompt finished fading in, including the one a user
  // had just clicked manually, so a manual selection could be silently
  // overridden a moment later by a stale timer from the prompt it
  // replaced. A single interval, cleared and restarted whenever
  // `activePrompt` changes (including from a manual click), has exactly
  // one timer alive at a time. Paused entirely under
  // prefers-reduced-motion, matching every other auto-playing element on
  // the page (Reveal, the navbar's mobile menu).
  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = setTimeout(() => {
      setActivePrompt((current) => (current + 1) % EXAMPLE_PROMPTS.length);
    }, 2600);
    return () => clearTimeout(timer);
  }, [activePrompt, reduceMotion]);

  return (
    <section id="ai" className="py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="AI Features"
            title="Just tell it what you want to hear"
            description="ENIZA's AI understands mood, context, and intent — not just keywords — to build the exact playlist you're picturing."
          />
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-2xl">
          <GlassCard className="shadow-[var(--shadow-glow-violet)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-blush)] to-[var(--color-accent-violet)]">
                <Sparkles className="h-4 w-4 text-[#1a1220]" aria-hidden />
              </span>
              <p className="text-sm font-medium text-[var(--color-foreground)]">ENIZA AI</p>
            </div>
            <div className="relative mt-4 h-14">
              {EXAMPLE_PROMPTS.map((prompt, index) => (
                <motion.p
                  key={prompt.text}
                  className="absolute inset-0 flex items-center text-base text-[var(--color-foreground-muted)] sm:text-lg"
                  initial={false}
                  animate={{ opacity: activePrompt === index ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  aria-hidden={activePrompt !== index}
                >
                  &ldquo;{prompt.text}&rdquo;
                </motion.p>
              ))}
            </div>
          </GlassCard>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <Reveal key={prompt.text} delay={Math.min(index * 0.05, 0.25)}>
              <button
                type="button"
                onClick={() => setActivePrompt(index)}
                className={cn(
                  'glass flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-5 py-4 text-left transition-colors hover:border-[var(--color-accent-rose)]/40',
                  activePrompt === index && 'border-[var(--color-accent-rose)]/60',
                )}
              >
                <prompt.icon className="h-4 w-4 flex-shrink-0 text-[var(--color-accent-rose)]" aria-hidden />
                <span className="text-sm text-[var(--color-foreground-muted)]">{prompt.text}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
