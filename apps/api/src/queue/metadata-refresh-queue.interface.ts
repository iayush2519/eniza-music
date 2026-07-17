export type RefreshableEntityType = 'track' | 'album' | 'artist';

export interface MetadataRefreshJob {
  entityType: RefreshableEntityType;
  /** Local metadata cache id (not a provider externalId). */
  localId: string;
}

/**
 * Generic job-queue port for background metadata refresh, per
 * docs/architecture/music-provider-architecture.md's background refresh
 * design. Deliberately knows nothing about `MusicGateway` or Drizzle —
 * it only moves `MetadataRefreshJob`s from a producer (`enqueue`, called
 * by `MusicGateway` on a stale cache read) to a consumer (whatever
 * handler `registerProcessor` was given, wired up by
 * `MetadataRefreshProcessor`). This keeps the queue technology
 * (BullMQ/Redis vs. in-process) fully swappable without touching the
 * refresh logic itself — the same separation `DATABASE_CONNECTION` and
 * `ACTIVE_MUSIC_PROVIDER` already apply to their respective concerns.
 */
export interface MetadataRefreshQueue {
  enqueue(job: MetadataRefreshJob): Promise<void>;
  registerProcessor(handler: (job: MetadataRefreshJob) => Promise<void>): void;
}
