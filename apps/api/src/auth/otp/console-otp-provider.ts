import { Injectable, Logger } from '@nestjs/common';

import { OtpDeliveryMessage, OtpDeliveryProvider } from './otp-delivery.interface';

/**
 * The default `OtpDeliveryProvider` for local development and every test
 * run: logs the code via Nest's `Logger` instead of sending a real
 * email/SMS. This is intentionally the *only* delivery mechanism wired up
 * in this phase — per the project's current development-phase scope, no
 * real email/SMS dependency (SMTP client, Twilio, MSG91, etc.) has been
 * added yet, since that's a new external dependency and, for anything
 * beyond local console delivery, a paid third-party account — both
 * decisions flagged separately rather than made silently.
 *
 * Swapping this out later is exactly the same shape of change
 * `DiscoveryModule` already demonstrates for `MusicProvider`
 * (`JamendoProvider` vs `MockProvider`, selected by a factory in
 * `auth.module.ts` based on config): implement `OtpDeliveryProvider`,
 * register it, and select it behind the `ACTIVE_OTP_DELIVERY_PROVIDER`
 * token when its config is present. No change to `OtpService` or
 * `AuthController` is required.
 */
@Injectable()
export class ConsoleOtpProvider implements OtpDeliveryProvider {
  readonly providerId = 'console';

  private readonly logger = new Logger(ConsoleOtpProvider.name);

  send(message: OtpDeliveryMessage): Promise<void> {
    this.logger.log(
      `[DEV OTP] purpose=${message.purpose} email=${message.email} code=${message.code}`,
    );
    return Promise.resolve();
  }
}
