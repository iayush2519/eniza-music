import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names (clsx) and then resolves conflicting
 * Tailwind utility classes in favor of the later one (tailwind-merge) —
 * the standard pairing so a consumer can override a component's default
 * classes (e.g. `<Button className="mt-8">`) without fighting class
 * order.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
