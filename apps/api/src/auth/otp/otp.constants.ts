/**
 * DI token for whichever `OtpDeliveryProvider` implementation is
 * currently active. Mirrors `ACTIVE_MUSIC_PROVIDER`
 * (discovery/discovery.constants.ts) — `OtpService` injects this token,
 * never a concrete provider class, so adding/selecting a delivery
 * mechanism later never requires changing `OtpService`.
 */
export const ACTIVE_OTP_DELIVERY_PROVIDER = Symbol('ACTIVE_OTP_DELIVERY_PROVIDER');
