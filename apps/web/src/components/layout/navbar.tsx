'use client';

import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/cn';

/**
 * Sticky navbar that gains a blurred/glass background once the page has
 * scrolled past the hero — `useScroll`/`useMotionValueEvent` reads the
 * page scroll position without re-rendering on every pixel (unlike a
 * naive `window.addEventListener('scroll', ...)` + `useState`).
 */
export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 8);
  });

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        isScrolled ? 'glass shadow-[0_1px_0_0_rgba(255,255,255,0.04)]' : 'bg-transparent',
      )}
    >
      <Container className="flex h-18 items-center justify-between py-4">
        <Link href="#top" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          <Image
            src="/branding/eniza-logo-white.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button href="#waitlist" size="md">
            Join Waitlist
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] p-2 text-[var(--color-foreground)] md:hidden"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {isMobileMenuOpen ? (
        <motion.nav
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass mx-4 mb-4 flex flex-col gap-1 rounded-[var(--radius-lg)] p-3 md:hidden"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-[var(--radius-md)] px-4 py-3 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-foreground)]"
            >
              {link.label}
            </Link>
          ))}
          <Button href="#waitlist" size="md" className="mt-2" onClick={() => setIsMobileMenuOpen(false)}>
            Join Waitlist
          </Button>
        </motion.nav>
      ) : null}
    </header>
  );
}
