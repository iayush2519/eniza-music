import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { OtpDeliveryMessage, OtpDeliveryProvider } from './otp-delivery.interface';
import { EnvironmentVariables } from '../../config/env.validation';

const SUBJECT_BY_PURPOSE: Record<OtpDeliveryMessage['purpose'], string> = {
  register: 'Verify your email',
  password_reset: 'Reset your password',
};

/** Transient SMTP failures (a momentary connection blip, a rate limit)
 * are worth a couple of retries before giving up — the same reasoning
 * `JamendoProvider` doesn't need (a failed search can just be re-run by
 * the caller) but OTP delivery does, since a silently-dropped code
 * directly blocks the user's registration/reset flow. */
const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

/**
 * Production `OtpDeliveryProvider`: sends the OTP code by email over
 * SMTP via Nodemailer. Deliberately generic SMTP rather than a
 * vendor-specific SDK (e.g. `@sendgrid/mail`, AWS SES SDK) — any
 * transactional-email provider that exposes an SMTP endpoint (SES,
 * SendGrid, Postmark, Mailgun, etc.) works via `SMTP_HOST`/`SMTP_PORT`/
 * `SMTP_USER`/`SMTP_PASSWORD` alone, matching this project's
 * provider-agnostic-adapter approach (mirrors `JamendoProvider` reading
 * config through `ConfigService` rather than hardcoding a vendor client).
 *
 * Selected over `ConsoleOtpProvider` by the `ACTIVE_OTP_DELIVERY_PROVIDER`
 * factory in auth.module.ts when `SMTP_HOST` is configured — see that
 * file for the selection logic. This class never checks its own
 * config to decide *whether* to run; it only throws a descriptive error
 * if asked to send without `SMTP_HOST` configured (mirrors
 * `JamendoProvider.get()` throwing when `JAMENDO_CLIENT_ID` is missing).
 */
@Injectable()
export class EmailOtpProvider implements OtpDeliveryProvider {
  readonly providerId = 'email';

  private readonly logger = new Logger(EmailOtpProvider.name);
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | undefined;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async send(message: OtpDeliveryMessage): Promise<void> {
    const transporter = this.getTransporter();
    const fromAddress = this.config.get('SMTP_FROM_ADDRESS', { infer: true });

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: message.email,
          subject: SUBJECT_BY_PURPOSE[message.purpose],
          text: this.renderBody(message),
        });
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `send attempt ${attempt}/${MAX_SEND_ATTEMPTS} to ${message.email} failed: ` +
            (error instanceof Error ? error.message : String(error)),
        );
        if (attempt < MAX_SEND_ATTEMPTS) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new Error(
      `EmailOtpProvider: failed to send OTP email to ${message.email} after ` +
        `${MAX_SEND_ATTEMPTS} attempts: ` +
        (lastError instanceof Error ? lastError.message : String(lastError)),
    );
  }

  /**
   * Builds the SMTP transport lazily (once) rather than in the
   * constructor, so this class can be safely registered as a Nest
   * provider even when SMTP isn't configured (the common case in local
   * dev/test, where `ConsoleOtpProvider` is selected instead) — the
   * config check only happens if `send()` is actually invoked.
   */
  private getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      throw new Error('EmailOtpProvider: SMTP_HOST is not configured (see .env.example)');
    }

    const port = this.config.get('SMTP_PORT', { infer: true });
    const secure = this.config.get('SMTP_SECURE', { infer: true }) === 'true';
    const user = this.config.get('SMTP_USER', { infer: true });
    const password = this.config.get('SMTP_PASSWORD', { infer: true });

    this.transporter = createTransport({
      host,
      port,
      secure,
      // Only set `auth` when both credentials are present — some SMTP
      // relays (e.g. an internal mail server) don't require
      // authentication at all, and Nodemailer treats a partially-filled
      // `auth` object as a configuration error.
      auth: user && password ? { user, pass: password } : undefined,
    });

    return this.transporter;
  }

  private renderBody(message: OtpDeliveryMessage): string {
    const action =
      message.purpose === 'register' ? 'complete your registration' : 'reset your password';
    return `Your verification code is ${message.code}. Use it to ${action}. This code will expire soon, and can only be used once.`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
