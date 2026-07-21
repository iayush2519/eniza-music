import { CheckCircle2, CircleDashed, CircleDot } from 'lucide-react';

import { Container } from '@/components/ui/container';
import { GlassCard } from '@/components/ui/glass-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';

type RoadmapStatus = 'shipped' | 'in-progress' | 'planned';

type RoadmapItem = {
  status: RoadmapStatus;
  title: string;
  description: string;
};

const ROADMAP: RoadmapItem[] = [
  {
    status: 'shipped',
    title: 'Core streaming experience',
    description: 'Search, playback, playlists, and a cross-platform library foundation.',
  },
  {
    status: 'shipped',
    title: 'ENIZA branding & design system',
    description: 'A cohesive visual identity across every surface of the product.',
  },
  {
    status: 'in-progress',
    title: 'AI playlist generation',
    description: 'Natural-language prompts that generate complete, tailored playlists.',
  },
  {
    status: 'in-progress',
    title: 'Offline downloads',
    description: 'Save tracks and playlists locally for listening without a connection.',
  },
  {
    status: 'planned',
    title: 'Collaborative playlists',
    description: 'Build and edit playlists together with friends, in real time.',
  },
  {
    status: 'planned',
    title: 'Artist tools & analytics',
    description: 'Give independent artists visibility into how listeners find their music.',
  },
];

const STATUS_META: Record<RoadmapStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  shipped: { label: 'Shipped', icon: CheckCircle2, color: 'text-[var(--color-success)]' },
  'in-progress': { label: 'In Progress', icon: CircleDot, color: 'text-[var(--color-accent-rose)]' },
  planned: { label: 'Planned', icon: CircleDashed, color: 'text-[var(--color-foreground-subtle)]' },
};

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Roadmap"
            title="Where ENIZA is headed"
            description="A transparent look at what's shipped, what's in progress, and what's coming next."
          />
        </Reveal>

        <div className="relative mx-auto mt-16 max-w-3xl">
          <div
            aria-hidden
            className="absolute left-[15px] top-2 hidden h-[calc(100%-2rem)] w-px bg-[var(--color-border-strong)] sm:block"
          />
          <ol className="flex flex-col gap-5">
            {ROADMAP.map((item, index) => {
              const meta = STATUS_META[item.status];
              return (
                <Reveal key={item.title} delay={Math.min(index * 0.06, 0.3)}>
                  <li className="relative flex gap-4 sm:pl-10">
                    <span
                      className={cn(
                        'absolute left-0 top-1 hidden h-8 w-8 items-center justify-center rounded-full bg-[var(--color-background-elevated)] sm:flex',
                        meta.color,
                      )}
                    >
                      <meta.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <GlassCard className="w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <meta.icon className={cn('h-4 w-4 sm:hidden', meta.color)} aria-hidden />
                        <span className={cn('text-xs font-medium uppercase tracking-widest', meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                        {item.description}
                      </p>
                    </GlassCard>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
