import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  /** Adds a hover lift + border glow — used for interactive cards (feature grid), not static ones (FAQ). */
  interactive?: boolean;
};

/**
 * The one recurring "premium card" surface used across Features, AI
 * Features, How It Works, and Product Preview — a translucent,
 * blurred-background panel with a soft border. Centralizing it means the
 * glassmorphism treatment the brief asks for is applied consistently
 * rather than each section inventing its own opacity/blur values.
 */
export function GlassCard({ children, className, interactive = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-[var(--radius-xl)] p-6 sm:p-8',
        interactive &&
          'transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent-blush)]/40 hover:shadow-[var(--shadow-glow-blush)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
