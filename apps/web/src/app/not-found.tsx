import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Container className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent-rose)]">
          404
        </p>
        <h1 className="text-3xl font-semibold text-[var(--color-foreground)] sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="max-w-md text-[var(--color-foreground-muted)]">
          The page you&apos;re looking for isn&apos;t here. Let&apos;s get you back to ENIZA Music.
        </p>
        <Button href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Button>
      </Container>
    </main>
  );
}
