/**
 * Site-wide constants. Centralized so copy that appears in multiple
 * places (nav + footer, metadata + JSON-LD) can't silently drift.
 */
export const SITE_NAME = 'ENIZA Music';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://enizamusic.dev';

export const SITE_DESCRIPTION =
  'ENIZA Music is an AI-powered music streaming platform. Discover new artists, generate AI playlists, and search music using natural language.';

export const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#ai', label: 'AI' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#faq', label: 'FAQ' },
] as const;

export const SOCIAL_LINKS = {
  github: 'https://github.com/iayush2519/eniza-music',
  twitter: 'https://twitter.com/enizamusic',
  instagram: 'https://instagram.com/enizamusic',
} as const;
