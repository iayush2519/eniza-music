import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { ACTIVE_MUSIC_PROVIDER } from './discovery.constants';
import type {
  MusicProvider,
  ProviderAlbum,
  ProviderArtist,
  ProviderTrack,
  ResolvedStream,
  SearchOptions,
} from './providers/music-provider.interface';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.module';
import { Album, Artist, albums, artists, Track, tracks } from '../database/schema';

export interface GatewaySearchResult {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}

/**
 * The single chokepoint between the rest of the backend and every
 * `MusicProvider` implementation, per
 * docs/architecture/music-provider-architecture.md — no other module is
 * meant to call a `MusicProvider` directly, the same discipline already
 * applied to `storage`/`queue`.
 *
 * Reads are cache-first: a search or entity lookup checks the local
 * metadata cache (`artists`/`albums`/`tracks`, keyed by
 * `(providerId, externalId)`) before calling the provider; any provider
 * result is normalized and upserted into the cache as a side effect of
 * serving the request, so the cache fills itself from real traffic rather
 * than only a separate sync job.
 *
 * Background metadata refresh for stale cache rows (lazy-on-read +
 * scheduled sweep) is a later milestone — this service always calls the
 * provider on a cache miss, but does not yet re-check age on a cache hit.
 */
@Injectable()
export class MusicGateway {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(ACTIVE_MUSIC_PROVIDER) private readonly provider: MusicProvider,
  ) {}

  async search(query: string, options?: SearchOptions): Promise<GatewaySearchResult> {
    const result = await this.provider.search(query, options);

    const [cachedTracks, cachedAlbums, cachedArtists] = await Promise.all([
      Promise.all(result.tracks.map((track) => this.upsertTrack(track))),
      Promise.all(result.albums.map((album) => this.upsertAlbum(album))),
      Promise.all(result.artists.map((artist) => this.upsertArtist(artist))),
    ]);

    return { tracks: cachedTracks, albums: cachedAlbums, artists: cachedArtists };
  }

  async getTrack(localId: string): Promise<Track | undefined> {
    return this.findCachedTrackById(localId);
  }

  async getAlbum(localId: string): Promise<Album | undefined> {
    return this.findCachedAlbumById(localId);
  }

  async getArtist(localId: string): Promise<Artist | undefined> {
    return this.findCachedArtistById(localId);
  }

  /**
   * Fetches a track from the provider by its own `externalId` (not a
   * local cache id) and upserts it, returning the resulting cache row.
   * Used when a caller has a provider-native reference and needs a local
   * `Track` to hand back (e.g. seeding — a later milestone).
   */
  async fetchAndCacheTrack(externalId: string): Promise<Track | null> {
    const providerTrack = await this.provider.getTrack(externalId);
    if (!providerTrack) {
      return null;
    }
    return this.upsertTrack(providerTrack);
  }

  async fetchAndCacheAlbum(externalId: string): Promise<Album | null> {
    const providerAlbum = await this.provider.getAlbum(externalId);
    if (!providerAlbum) {
      return null;
    }
    return this.upsertAlbum(providerAlbum);
  }

  async fetchAndCacheArtist(externalId: string): Promise<Artist | null> {
    const providerArtist = await this.provider.getArtist(externalId);
    if (!providerArtist) {
      return null;
    }
    return this.upsertArtist(providerArtist);
  }

  /**
   * Resolves a playable stream URL for a local cache id. Throws if the
   * local id isn't a cached track, or if the cached row somehow has no
   * provider reference (should not happen for a row this service wrote,
   * but is checked explicitly rather than assumed).
   */
  async resolveStreamUrl(localTrackId: string): Promise<ResolvedStream> {
    const track = await this.findCachedTrackById(localTrackId);
    if (!track) {
      throw new Error(`MusicGateway: no cached track with id "${localTrackId}"`);
    }
    if (!track.externalId) {
      throw new Error(`MusicGateway: cached track "${localTrackId}" has no provider reference`);
    }

    return this.provider.resolveStreamUrl(track.externalId);
  }

  /**
   * Related tracks are an optional provider capability (see
   * docs/decisions/0007-provider-backed-music-catalog.md — recommendations
   * treat this as enrichment, never a required dependency). Returns an
   * empty array, rather than throwing, when the active provider doesn't
   * implement it or the track has no provider reference.
   */
  async getRelatedTracks(localTrackId: string): Promise<Track[]> {
    if (typeof this.provider.getRelatedTracks !== 'function') {
      return [];
    }

    const track = await this.findCachedTrackById(localTrackId);
    if (!track?.externalId) {
      return [];
    }

    const related = await this.provider.getRelatedTracks(track.externalId);
    return Promise.all(related.map((providerTrack) => this.upsertTrack(providerTrack)));
  }

  private async findCachedTrackById(id: string): Promise<Track | undefined> {
    const [track] = await this.db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
    return track;
  }

  private async findCachedAlbumById(id: string): Promise<Album | undefined> {
    const [album] = await this.db.select().from(albums).where(eq(albums.id, id)).limit(1);
    return album;
  }

  private async findCachedArtistById(id: string): Promise<Artist | undefined> {
    const [artist] = await this.db.select().from(artists).where(eq(artists.id, id)).limit(1);
    return artist;
  }

  /**
   * Upserts a normalized provider artist into the cache, keyed on the
   * `(providerId, externalId)` unique index. An artist is cached first
   * (rather than inline as part of caching a track/album) because both
   * `tracks` and `albums` have a `not null` FK to `artists.id` — a
   * provider entity being cached always needs its artist's local id
   * resolved first.
   *
   * Uses an atomic `ON CONFLICT DO UPDATE` rather than a separate
   * find-then-insert-or-update: `search()` upserts every track/album/
   * artist in a result set concurrently (`Promise.all`), and several of
   * them can legitimately share the same artist (e.g. two tracks by the
   * same artist) — a non-atomic check-then-write would race and violate
   * the unique index when two concurrent upserts for the same artist both
   * see "not found" and both try to insert.
   */
  private async upsertArtist(providerArtist: ProviderArtist): Promise<Artist> {
    const values = {
      providerId: providerArtist.providerId,
      externalId: providerArtist.externalId,
      name: providerArtist.name,
      avatarUrl: providerArtist.imageUrl,
      lastRefreshedAt: new Date(),
    };

    const [row] = await this.db
      .insert(artists)
      .values(values)
      .onConflictDoUpdate({ target: [artists.providerId, artists.externalId], set: values })
      .returning();
    return row;
  }

  /**
   * Upserts a normalized provider album, resolving (and upserting) its
   * artist first since `albums.artistId` is a `not null` FK. Atomic
   * upsert for the same reason as `upsertArtist`.
   */
  private async upsertAlbum(providerAlbum: ProviderAlbum): Promise<Album> {
    const artist = await this.upsertArtist({
      providerId: providerAlbum.providerId,
      externalId: providerAlbum.artistExternalId,
      name: providerAlbum.artistName,
      imageUrl: null,
    });

    const values = {
      artistId: artist.id,
      providerId: providerAlbum.providerId,
      externalId: providerAlbum.externalId,
      title: providerAlbum.title,
      coverArtUrl: providerAlbum.artworkUrl,
      releasedAt: providerAlbum.releasedAt ? new Date(providerAlbum.releasedAt) : null,
      lastRefreshedAt: new Date(),
    };

    const [row] = await this.db
      .insert(albums)
      .values(values)
      .onConflictDoUpdate({ target: [albums.providerId, albums.externalId], set: values })
      .returning();
    return row;
  }

  /**
   * Upserts a normalized provider track, resolving (and upserting) its
   * artist and, if present, album first — both are `not null`/nullable
   * FKs respectively on `tracks`. Atomic upsert for the same reason as
   * `upsertArtist`.
   */
  private async upsertTrack(providerTrack: ProviderTrack): Promise<Track> {
    const artist = await this.upsertArtist({
      providerId: providerTrack.providerId,
      externalId: providerTrack.artistExternalId,
      name: providerTrack.artistName,
      imageUrl: null,
    });

    const albumId =
      providerTrack.albumExternalId && providerTrack.albumTitle
        ? (
            await this.upsertAlbum({
              providerId: providerTrack.providerId,
              externalId: providerTrack.albumExternalId,
              title: providerTrack.albumTitle,
              artistName: providerTrack.artistName,
              artistExternalId: providerTrack.artistExternalId,
              artworkUrl: providerTrack.artworkUrl,
              releasedAt: null,
            })
          ).id
        : null;

    const values = {
      artistId: artist.id,
      albumId,
      providerId: providerTrack.providerId,
      externalId: providerTrack.externalId,
      title: providerTrack.title,
      durationSeconds: providerTrack.durationSeconds,
      coverArtUrl: providerTrack.artworkUrl,
      lastRefreshedAt: new Date(),
    };

    const [row] = await this.db
      .insert(tracks)
      .values(values)
      .onConflictDoUpdate({ target: [tracks.providerId, tracks.externalId], set: values })
      .returning();
    return row;
  }
}
