import { ListMusic, MessageCircleMore, Sparkles, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Container } from '@/components/ui/container';
import { GlassCard } from '@/components/ui/glass-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: 'Create your account',
    description: 'Sign up in seconds and tell ENIZA a little about what you listen to.',
  },
  {
    icon: MessageCircleMore,
    title: 'Describe what you want',
    description: 'Type a mood, activity, or reference track — in plain language.',
  },
  {
    icon: Sparkles,
    title: 'AI builds your playlist',
    description: 'ENIZA generates a tailored playlist in seconds, ready to play.',
  },
  {
    icon: ListMusic,
    title: 'Listen and refine',
    description: 'Save it, tweak it, or ask for something different — it keeps learning.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="How It Works"
            title="From idea to playlist in four steps"
            description="No complicated setup. Just describe what you want to hear and let ENIZA do the rest."
          />
        </Reveal>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <GlassCard className="relative h-full">
                <span className="absolute right-6 top-6 text-4xl font-semibold text-white/5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <step.icon className="h-6 w-6 text-[var(--color-accent-rose)]" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {step.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
