/**
 * DI token for whichever `MusicProvider` implementation is currently
 * active (`JamendoProvider` when `JAMENDO_CLIENT_ID` is configured,
 * `MockProvider` otherwise — see discovery.module.ts). `MusicGateway`
 * injects this token rather than a concrete provider class, so selecting
 * or adding a provider later never requires changing Gateway code — the
 * same explicit-DI-token pattern already used for `DATABASE_CONNECTION`.
 */
export const ACTIVE_MUSIC_PROVIDER = Symbol('ACTIVE_MUSIC_PROVIDER');
