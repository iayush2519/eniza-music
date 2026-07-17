import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  MusicProvider,
  ProviderAlbum,
  ProviderArtist,
  ProviderSearchResult,
  ProviderTrack,
  ResolvedStream,
  SearchOptions,
} from './music-provider.interface';
import { EnvironmentVariables } from '../../config/env.validation';

/**
 * Raw Jamendo `/tracks` result shape (only the fields this adapter reads;
 * Jamendo returns several more). Confirmed against
 * https://developer.jamendo.com/v3.0/tracks and a real sample response —
 * numeric-looking fields (`id`, `artist_id`, `album_id`) are JSON strings,
 * not numbers, hence `string` types below rather than `number`.
 */
interface JamendoTrackResult {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_id: string | null;
  album_name: string | null;
  album_image: string | null;
  image: string | null;
  audio: string;
}

interface JamendoAlbumResult {
  id: string;
  name: string;
  artist_id: string;
  artist_name: string;
  image: string | null;
  releasedate: string | null;
}

interface JamendoArtistResult {
  id: string;
  name: string;
  image: string | null;
}

interface JamendoResponse<T> {
  headers: { status: string; code: number; error_message: string };
  results: T[];
}

/**
 * Real `MusicProvider` adapter for the Jamendo API v3.0
 * (https://developer.jamendo.com/v3.0/docs) — a catalog of independent,
 * Creative-Commons-licensed music with a genuine third-party metadata +
 * direct-stream API, per
 * docs/architecture/music-provider-architecture.md's provider decision.
 * Every method here does the same normalization job `MockProvider` does:
 * map Jamendo's native response shape into the provider-agnostic
 * `ProviderTrack`/`ProviderAlbum`/`ProviderArtist` types — nothing above
 * this layer (the Gateway, other backend modules, mobile) ever sees a
 * Jamendo-shaped object.
 */
@Injectable()
export class JamendoProvider implements MusicProvider {
  readonly providerId = 'jamendo';

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async search(query: string, options?: SearchOptions): Promise<ProviderSearchResult> {
    const type = options?.type;
    const limit = options?.limit ?? 20;

    const [tracks, albums, artists] = await Promise.all([
      type && type !== 'track' ? Promise.resolve([]) : this.searchTracks(query, limit),
      type && type !== 'album' ? Promise.resolve([]) : this.searchAlbums(query, limit),
      type && type !== 'artist' ? Promise.resolve([]) : this.searchArtists(query, limit),
    ]);

    return { tracks, albums, artists };
  }

  async getTrack(externalId: string): Promise<ProviderTrack | null> {
    const response = await this.get<JamendoTrackResult>('/tracks', { id: externalId });
    const [result] = response.results;
    return result ? this.normalizeTrack(result) : null;
  }

  async getAlbum(externalId: string): Promise<ProviderAlbum | null> {
    const response = await this.get<JamendoAlbumResult>('/albums', { id: externalId });
    const [result] = response.results;
    return result ? this.normalizeAlbum(result) : null;
  }

  async getArtist(externalId: string): Promise<ProviderArtist | null> {
    const response = await this.get<JamendoArtistResult>('/artists', { id: externalId });
    const [result] = response.results;
    return result ? this.normalizeArtist(result) : null;
  }

  /**
   * Jamendo's `audio` field returned by `/tracks` is already the
   * streamable URL — no separate signed-URL exchange is needed for this
   * provider. `expiresAt: null` because Jamendo's stream URLs are not
   * documented as time-limited (unlike, say, a signed CloudFront URL).
   */
  async resolveStreamUrl(externalId: string): Promise<ResolvedStream> {
    const track = await this.getTrackRaw(externalId);
    if (!track) {
      throw new Error(`JamendoProvider: unknown track externalId "${externalId}"`);
    }
    return { url: track.audio, expiresAt: null };
  }

  /**
   * Jamendo has no dedicated "related tracks" endpoint, so this provider
   * approximates it with other tracks by the same artist — a reasonable
   * fallback, and per
   * docs/decisions/0007-provider-backed-music-catalog.md, provider
   * enrichment is optional and secondary to our own behavioral data
   * anyway, so an approximation here is acceptable.
   */
  async getRelatedTracks(externalId: string): Promise<ProviderTrack[]> {
    const track = await this.getTrackRaw(externalId);
    if (!track) {
      return [];
    }

    const response = await this.get<JamendoTrackResult>('/artists/tracks', {
      id: track.artist_id,
    });

    return response.results
      .filter((result) => result.id !== externalId)
      .map((result) => this.normalizeTrack(result));
  }

  private async searchTracks(query: string, limit: number): Promise<ProviderTrack[]> {
    const response = await this.get<JamendoTrackResult>('/tracks', {
      search: query,
      limit: String(limit),
    });
    return response.results.map((result) => this.normalizeTrack(result));
  }

  private async searchAlbums(query: string, limit: number): Promise<ProviderAlbum[]> {
    const response = await this.get<JamendoAlbumResult>('/albums', {
      namesearch: query,
      limit: String(limit),
    });
    return response.results.map((result) => this.normalizeAlbum(result));
  }

  private async searchArtists(query: string, limit: number): Promise<ProviderArtist[]> {
    const response = await this.get<JamendoArtistResult>('/artists', {
      namesearch: query,
      limit: String(limit),
    });
    return response.results.map((result) => this.normalizeArtist(result));
  }

  private async getTrackRaw(externalId: string): Promise<JamendoTrackResult | null> {
    const response = await this.get<JamendoTrackResult>('/tracks', { id: externalId });
    return response.results[0] ?? null;
  }

  private normalizeTrack(result: JamendoTrackResult): ProviderTrack {
    return {
      providerId: this.providerId,
      externalId: result.id,
      title: result.name,
      artistName: result.artist_name,
      artistExternalId: result.artist_id,
      albumTitle: result.album_name,
      albumExternalId: result.album_id,
      durationSeconds: result.duration,
      artworkUrl: result.image ?? result.album_image ?? null,
    };
  }

  private normalizeAlbum(result: JamendoAlbumResult): ProviderAlbum {
    return {
      providerId: this.providerId,
      externalId: result.id,
      title: result.name,
      artistName: result.artist_name,
      artistExternalId: result.artist_id,
      artworkUrl: result.image ?? null,
      releasedAt: result.releasedate ?? null,
    };
  }

  private normalizeArtist(result: JamendoArtistResult): ProviderArtist {
    return {
      providerId: this.providerId,
      externalId: result.id,
      name: result.name,
      imageUrl: result.image ?? null,
    };
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<JamendoResponse<T>> {
    const clientId = this.config.get('JAMENDO_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw new Error('JamendoProvider: JAMENDO_CLIENT_ID is not configured (see .env.example)');
    }
    const baseUrl = this.config.get('JAMENDO_API_BASE_URL', { infer: true });

    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`JamendoProvider: request to ${path} failed with status ${response.status}`);
    }

    const body = (await response.json()) as JamendoResponse<T>;
    if (body.headers.status !== 'success') {
      throw new Error(`JamendoProvider: API error — ${body.headers.error_message}`);
    }

    return body;
  }
}
