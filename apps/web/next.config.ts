import type { NextConfig } from 'next';

/**
 * apps/web is a standalone Next.js App Router project inside the
 * monorepo. It intentionally does not import anything from apps/api or
 * apps/mobile, and does not depend on packages/design-system (that
 * package's primitives are React Native components, not usable in a DOM
 * environment) — see docs/architecture/monorepo-structure.md for the
 * dependency-direction rule this respects. Visual identity is kept
 * consistent by hand-porting the same design tokens as literal Tailwind
 * theme values (see src/app/globals.css), not by a shared runtime import.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // No remote images are used; ENIZA branding assets are served
    // locally from /public. Keeping this explicit (rather than default)
    // documents that decision instead of leaving it implicit.
    remotePatterns: [],
  },
};

export default nextConfig;
