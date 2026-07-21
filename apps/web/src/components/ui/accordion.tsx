'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { cn } from '@/lib/cn';

export type AccordionItemData = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItemData[];
  className?: string;
};

/**
 * Single-open FAQ accordion. Hand-rolled on top of plain `useState`
 * rather than pulling in `@radix-ui/react-accordion` — a single,
 * self-contained expand/collapse list doesn't need a full primitive
 * library, and it keeps apps/web's dependency footprint limited to what
 * the brief actually specified (Framer Motion, Lucide, Tailwind).
 * `aria-expanded`/`aria-controls`/`role="region"` are wired by hand
 * instead, covering the accessibility contract Radix would have given
 * for free.
 */
export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <div key={item.question} className="glass overflow-hidden rounded-[var(--radius-lg)]">
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
            >
              <span className="text-base font-medium text-[var(--color-foreground)] sm:text-lg">
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 flex-shrink-0 text-[var(--color-foreground-subtle)] transition-transform duration-300',
                  isOpen && 'rotate-180 text-[var(--color-accent-rose)]',
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-foreground-muted)] sm:px-6 sm:pb-6 sm:text-base">
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
