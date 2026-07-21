import type { Metadata } from 'next';

import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { AiFeaturesSection } from '@/components/sections/ai-features-section';
import { FaqSection } from '@/components/sections/faq-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { HeroSection } from '@/components/sections/hero-section';
import { HowItWorksSection } from '@/components/sections/how-it-works-section';
import { ProductPreviewSection } from '@/components/sections/product-preview-section';
import { RoadmapSection } from '@/components/sections/roadmap-section';
import { WaitlistSection } from '@/components/sections/waitlist-section';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${SITE_NAME} — The AI-Powered Music Platform`,
  description: SITE_DESCRIPTION,
};

/**
 * Single-page landing site. Every section is its own component under
 * src/components/sections — composed here in the exact order specified
 * for this phase: Hero, Features, AI Features, How It Works, Product
 * Preview, Roadmap, FAQ, Waitlist, Footer. Each section owns its own
 * `id` (used by Navbar's anchor links) so this file stays a pure
 * composition root with no layout logic of its own.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AiFeaturesSection />
        <HowItWorksSection />
        <ProductPreviewSection />
        <RoadmapSection />
        <FaqSection />
        <WaitlistSection />
      </main>
      <Footer />
    </>
  );
}
