/**
 * DI token for the metadata-refresh job queue. Mirrors
 * `DATABASE_CONNECTION`/`ACTIVE_MUSIC_PROVIDER`'s explicit-token pattern:
 * consumers depend on this token, never a concrete BullMQ/ioredis type,
 * so the underlying job-queue technology could be swapped without
 * touching any caller.
 */
export const METADATA_REFRESH_QUEUE = Symbol('METADATA_REFRESH_QUEUE');
