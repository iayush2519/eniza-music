import { Accordion, type AccordionItemData } from '@/components/ui/accordion';
import { Container } from '@/components/ui/container';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';

const FAQ_ITEMS: AccordionItemData[] = [
  {
    question: 'What is ENIZA Music?',
    answer:
      'ENIZA Music is an AI-powered music streaming platform that helps you discover, stream, and organize music through intelligent recommendations and natural-language playlist generation.',
  },
  {
    question: 'How does the AI playlist generator work?',
    answer:
      'You describe what you want in plain language — a mood, an activity, or a reference song — and ENIZA builds a complete playlist tailored to that description in seconds.',
  },
  {
    question: 'Is ENIZA Music available yet?',
    answer:
      'ENIZA is currently in active development. Join the waitlist below to get early access and be notified as soon as it launches.',
  },
  {
    question: 'Which platforms will ENIZA support?',
    answer:
      'ENIZA is being built mobile-first, with cross-platform sync so your library and playback state follow you across devices.',
  },
  {
    question: 'Can I listen offline?',
    answer:
      'Yes. Offline listening is a core feature — download songs and playlists to listen without an internet connection.',
  },
  {
    question: 'Will there be a free plan?',
    answer:
      'Yes, ENIZA is planned to launch with a free tier alongside Premium, Family, and Student plans. Pricing details will be announced closer to launch.',
  },
  {
    question: 'How is ENIZA different from other streaming apps?',
    answer:
      'ENIZA is built around natural-language discovery and AI-generated playlists from the ground up, rather than added on top of a traditional keyword-search experience.',
  },
  {
    question: 'Will independent artists be supported?',
    answer:
      'Yes. Artist discovery and tools for independent artists are part of the roadmap — see the Roadmap section above.',
  },
  {
    question: 'How do I join the waitlist?',
    answer:
      'Scroll down to the waitlist section and submit your name and email. You will be notified as new access becomes available.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Protecting listener data is a priority as ENIZA moves toward launch. Privacy practices will be published in full alongside the public launch.',
  },
  {
    question: 'Can I suggest a feature?',
    answer:
      'Absolutely — use the waitlist form to share feedback or feature requests. Early input directly shapes what gets built next.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container className="max-w-3xl">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            description="Everything you might want to know about ENIZA Music before joining the waitlist."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <Accordion items={FAQ_ITEMS} />
        </Reveal>
      </Container>
    </section>
  );
}
