import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/**
 * Styled text input for the waitlist form. `invalid` drives the red
 * error-state border rather than relying on `:invalid` pseudo-class
 * styling, since validation here is client-side/custom (see
 * waitlist-form.tsx), not native HTML constraint validation.
 */
export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-[var(--radius-md)] border bg-white/5 px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-subtle)] outline-none transition-colors focus:border-[var(--color-accent-blush)] focus:bg-white/[0.07]',
        invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]',
        className,
      )}
      {...rest}
    />
  );
}
