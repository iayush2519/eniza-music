/**
 * The lifecycle status of the current queue item, as tracked by whichever
 * `PlaybackEngine` implementation is active. `packages/audio-engine`
 * intentionally does not yet ship a concrete implementation — see
 * docs/architecture/audio-engine.md — so nothing currently transitions a
 * `PlaybackState` past `'ready'`. `'playing'`/`'paused'`/`'buffering'`/
 * `'ended'` are part of the contract a native engine (a later milestone)
 * will drive.
 */
export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

/**
 * Mirrors ExoPlayer's own repeat-mode primitive (`Player.REPEAT_MODE_*`)
 * one-to-one — per playback-engine.ts's existing rule that queue
 * navigation/repeat lives in the native engine, not JS-side
 * reimplementation, repeat is a command the engine executes on its own
 * playlist, not something the app computes by rewriting `currentIndex`.
 * `'one'` repeats the current item; `'all'` repeats the whole queue.
 */
export type RepeatMode = 'off' | 'one' | 'all';

/**
 * One playable entry in a queue. `streamUrl` is populated lazily —  a
 * queue item starts with `streamUrl: null` until `resolveQueueItemStream`
 * (see stream-resolver.ts) resolves it against the backend's
 * `GET /playback/resolve/:trackId`
 * (apps/api/src/playback/playback.controller.ts), since a provider's
 * stream URL can be short-lived and shouldn't be resolved before it's
 * actually needed.
 */
export interface QueueItem {
  /** Local metadata cache id — the same id search results, playlists, and
   * library entries all use (see `@music-app/shared-types`' `Track`). */
  trackId: string;
  title: string;
  artistName: string | null;
  artworkUrl: string | null;
  durationMs: number;
  streamUrl: string | null;
}

/** A snapshot of everything the UI needs to render "what's playing". */
export interface PlaybackState {
  queue: QueueItem[];
  /** Index into `queue`, or -1 when nothing is loaded. */
  currentIndex: number;
  positionMs: number;
  status: PlaybackStatus;
  error: string | null;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  /** ExoPlayer's own playback speed multiplier (1.0 = normal speed). */
  playbackRate: number;
}

/**
 * The shape a track-resolution dependency must satisfy to be used with
 * `resolveQueueItemStream`. Structurally satisfied by
 * `@music-app/api-client`'s `PlaybackClient`
 * (packages/api-client/src/clients/playback.client.ts) without this
 * package depending on `api-client` directly — `audio-engine` stays
 * dependency-light, per its role as a platform-abstraction boundary (see
 * docs/architecture/audio-engine.md). Whatever wires a `PlaybackEngine`
 * up (the mobile app) is what supplies the real `PlaybackClient` here.
 */
export interface StreamUrlProvider {
  resolveStreamUrl(trackId: string): Promise<{ url: string; expiresAt: string | null }>;
}
