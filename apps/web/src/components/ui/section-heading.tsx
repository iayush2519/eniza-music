import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
};

/**
 * Consistent section header (small uppercase eyebrow label + large title
 * + optional supporting copy) reused by every section — Features, AI,
 * How It Works, Roadmap, FAQ, Waitlist. Keeps heading typography/spacing
 * from drifting section to section.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? (
        <span className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-rose)]">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base text-[var(--color-foreground-muted)] sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
