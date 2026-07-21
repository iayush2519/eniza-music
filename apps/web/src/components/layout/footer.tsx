import { AtSign, Camera, Code2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Container } from '@/components/ui/container';
import { SITE_NAME, SOCIAL_LINKS } from '@/lib/constants';

const FOOTER_COLUMNS = [
  {
    title: 'Company',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'AI', href: '#ai' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Roadmap', href: '#roadmap' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'Join Waitlist', href: '#waitlist' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
];

/** Footer content is intentionally static/placeholder for Privacy Policy
 * and Terms of Service — the brief for this phase excludes building a
 * backend, accounts, or legal-document pages; those links are left as
 * anchors pending real documents rather than fabricated legal text. */
export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background-elevated)]">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Link href="#top" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
            <Image
              src="/branding/eniza-logo-white.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full"
            />
            <span className="text-base font-semibold tracking-tight text-[var(--color-foreground)]">
              {SITE_NAME}
            </span>
          </Link>
          <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">
            The AI-powered music platform for discovering, streaming, and organizing the music you
            love.
          </p>
          {/* lucide-react 1.0 removed all trademarked brand icons (GitHub,
              Twitter/X, Instagram, etc.) — see
              https://github.com/lucide-icons/lucide/issues/2792. Generic,
              non-trademarked stand-ins are used here instead of pulling
              in a separate brand-icon package. */}
          <div className="flex items-center gap-3 pt-2">
            <SocialLink href={SOCIAL_LINKS.github} label="GitHub">
              <Code2 className="h-4 w-4" />
            </SocialLink>
            <SocialLink href={SOCIAL_LINKS.twitter} label="Twitter">
              <AtSign className="h-4 w-4" />
            </SocialLink>
            <SocialLink href={SOCIAL_LINKS.instagram} label="Instagram">
              <Camera className="h-4 w-4" />
            </SocialLink>
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{column.title}</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <Container className="flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] py-6 sm:flex-row">
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <p className="text-xs text-[var(--color-foreground-subtle)]">Built for the love of music.</p>
      </Container>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="glass flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
    >
      {children}
    </a>
  );
}
