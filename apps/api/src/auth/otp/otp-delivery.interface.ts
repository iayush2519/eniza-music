/**
 * The message an `OtpDeliveryProvider` is asked to deliver. Deliberately
 * provider-agnostic (a plain email + code + purpose), the same way
 * `MusicProvider` (see discovery/providers/music-provider.interface.ts)
 * normalizes away any one external API's request shape — nothing above
 * this layer (`OtpService`, `AuthService`) ever needs to know whether the
 * active provider is an SMTP client, a transactional-email API, or (for
 * this development phase) a console logger.
 */
export type OtpDeliveryMessage = {
  email: string;
  code: string;
  purpose: 'register' | 'password_reset';
};

/**
 * The provider abstraction for OTP delivery, mirroring
 * `MusicProvider`'s role in `discovery/providers/music-provider.interface.ts`
 * — a single interface every concrete delivery mechanism implements, so
 * swapping the underlying channel (console logging in development; a
 * transactional email API, or an SMS provider like Twilio/MSG91 for
 * production) is a new class + one factory line in `auth.module.ts`,
 * never a change to `OtpService` or `AuthService`.
 */
export interface OtpDeliveryProvider {
  readonly providerId: string;
  send(message: OtpDeliveryMessage): Promise<void>;
}
