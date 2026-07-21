import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type PillProps = {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Small rounded label used for the hero's "AI-Powered" tag and the AI
 * Features section's example-prompt chips. Separate from Button — a
 * Pill is never clickable, only informational.
 */
export function Pill({ children, icon: Icon, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-white/5 px-4 py-2 text-sm text-[var(--color-foreground-muted)]',
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-[var(--color-accent-rose)]" aria-hidden /> : null}
      {children}
    </span>
  );
}
