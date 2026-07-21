'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail, Send, User } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';
import { localWaitlistService } from '@/lib/waitlist-service';
import type { WaitlistRole } from '@/types/waitlist';

const ROLE_OPTIONS: { value: WaitlistRole; label: string }[] = [
  { value: 'listener', label: 'Listener' },
  { value: 'artist', label: 'Artist' },
  { value: 'investor', label: 'Investor' },
  { value: 'other', label: 'Other' },
];

type FieldErrors = Partial<Record<'name' | 'email', string>>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Waitlist form. Validation is intentionally simple client-side checks
 * (required name, valid email shape) rather than a schema library —
 * there are only two required fields, so `zod`/`react-hook-form` would
 * be more machinery than the form needs. Submission goes through
 * `localWaitlistService` (see src/lib/waitlist-service.ts), the one
 * "backend" this static marketing site has, per this phase's explicit
 * scope (no real backend/auth/accounts).
 */
export function WaitlistSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WaitlistRole>('listener');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Please enter your name.';
    }
    if (!isValidEmail(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setStatus('submitting');
    setStatusMessage(null);

    const result = await localWaitlistService.submit({
      name: name.trim(),
      email: email.trim(),
      role,
      message: message.trim() || undefined,
    });

    if (result.ok) {
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
      setRole('listener');
    } else {
      setStatus('error');
      setStatusMessage(result.error);
    }
  }

  return (
    <section id="waitlist" className="py-24 sm:py-32">
      <Container className="max-w-2xl">
        <Reveal>
          <SectionHeading
            eyebrow="Join the Waitlist"
            title="Be the first to experience ENIZA"
            description="Sign up for early access and updates as we build toward launch."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <GlassCard>
            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-6 text-center"
              >
                <CheckCircle2 className="h-12 w-12 text-[var(--color-success)]" aria-hidden />
                <h3 className="text-xl font-semibold text-[var(--color-foreground)]">
                  You&apos;re on the list!
                </h3>
                <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">
                  Thanks for joining the ENIZA waitlist. We&apos;ll be in touch as early access opens
                  up.
                </p>
                <Button
                  variant="secondary"
                  className="mt-2"
                  onClick={() => setStatus('idle')}
                  type="button"
                >
                  Submit another response
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" htmlFor="waitlist-name" error={errors.name}>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-subtle)]"
                        aria-hidden
                      />
                      <Input
                        id="waitlist-name"
                        name="name"
                        autoComplete="name"
                        placeholder="Your name"
                        className="pl-10"
                        value={name}
                        invalid={Boolean(errors.name)}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                  </Field>

                  <Field label="Email" htmlFor="waitlist-email" error={errors.email}>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-subtle)]"
                        aria-hidden
                      />
                      <Input
                        id="waitlist-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={email}
                        invalid={Boolean(errors.email)}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                  </Field>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm text-[var(--color-foreground-muted)]">
                    I am joining as a...
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        aria-pressed={role === option.value}
                        className={cn(
                          'rounded-[var(--radius-pill)] border px-4 py-1.5 text-sm transition-colors',
                          role === option.value
                            ? 'border-[var(--color-accent-blush)] bg-[var(--color-accent-blush)]/10 text-[var(--color-foreground)]'
                            : 'border-[var(--color-border-strong)] text-[var(--color-foreground-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Field label="Message (optional)" htmlFor="waitlist-message">
                  <textarea
                    id="waitlist-message"
                    name="message"
                    rows={3}
                    placeholder="Anything you'd like us to know?"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white/5 px-4 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-subtle)] outline-none transition-colors focus:border-[var(--color-accent-blush)] focus:bg-white/[0.07]"
                  />
                </Field>

                {status === 'error' && statusMessage ? (
                  <p role="alert" className="text-sm text-[var(--color-danger)]">
                    {statusMessage}
                  </p>
                ) : null}

                <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-1">
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden />
                      Join Waitlist
                    </>
                  )}
                </Button>
              </form>
            )}
          </GlassCard>
        </Reveal>
      </Container>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-[var(--color-foreground-muted)]">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
