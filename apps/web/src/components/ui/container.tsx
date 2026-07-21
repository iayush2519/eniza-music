import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type ContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/**
 * Consistent max-width + horizontal padding wrapper. Every section uses
 * this instead of repeating `mx-auto max-w-* px-*` literals, so changing
 * the page's content width is a one-line change here.
 */
export function Container<T extends ElementType = 'div'>({
  as,
  children,
  className,
  ...rest
}: ContainerProps<T>) {
  const Component = as ?? 'div';
  return (
    <Component className={cn('mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10', className)} {...rest}>
      {children}
    </Component>
  );
}
