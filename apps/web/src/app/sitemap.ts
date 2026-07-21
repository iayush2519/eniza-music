import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/constants';

/**
 * Single-page site, so this is a single entry — kept as a proper
 * `sitemap.ts` (rather than a static `sitemap.xml` in /public) so it
 * stays correct automatically if additional routes (e.g. a real Privacy
 * Policy/Terms page) are added later.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
