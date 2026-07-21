'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

import { useReducedMotion } from '@/lib/use-reduced-motion';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds, for animating a list of siblings in sequence. */
  delay?: number;
  /** Vertical travel distance in pixels before settling. */
  distance?: number;
};

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Scroll-triggered fade/rise-in wrapper, used by every section on the
 * page instead of each section hand-rolling its own `whileInView`
 * config. `viewport={{ once: true }}` means a section animates in the
 * first time it's scrolled to and then stays put — content re-animating
 * every time a user scrolls up and down past it would read as gimmicky,
 * not premium.
 *
 * Respects `prefers-reduced-motion`: when enabled, content renders
 * immediately with no transform/opacity transition at all, rather than
 * a "less" animation (per the same rule
 * packages/design-system/src/theme/use-reduced-motion.ts documents for
 * the mobile app).
 */
export function Reveal({ children, className, delay = 0, distance = 24 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0, 0, 1] }}
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  );
}

export { variants as revealVariants };
