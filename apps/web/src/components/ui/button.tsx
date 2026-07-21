import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-medium ' +
  'transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[var(--color-accent-blush)]/60 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[var(--color-accent-blush)] to-[var(--color-accent-rose)] text-[#211318] ' +
    'shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset] hover:brightness-110 active:brightness-95',
  secondary: 'glass text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]',
  ghost: 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-white/5',
};

const sizeClasses: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Single Button component covering both real `<button>` actions (e.g.
 * the waitlist form submit) and CTA links (e.g. "Get Started" scrolling
 * to #waitlist) — decided by whether `href` is passed, so call sites
 * never have to pick between two component names for what is visually
 * one design element.
 */
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorProps } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<ButtonAsButton, 'variant' | 'size' | 'children' | 'className'>;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
