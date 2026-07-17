/**
 * Normalized, provider-agnostic shapes returned by every `MusicProvider`
 * implementation. Per docs/architecture/music-provider-architecture.md,
 * nothing above this layer (the future `MusicGateway`, other backend
 * modules, the mobile app) ever sees a provider's native response
 * format — every adapter (Jamendo, a future second provider, the
 * in-memory `MockProvider`) maps its own API shape into these types.
 *
 * Field choices are deliberately provider-neutral: `artistName` is a
 * plain string, not a foreign key, because the provider owns artist
 * identity, not us (see decisions/0007-provider-backed-music-catalog.md).
 */

export type SearchEntityType = 'track' | 'album' | 'artist';

export interface SearchOptions {
  /** Restrict results to one entity kind. Omitted = search all kinds. */
  type?: SearchEntityType;
  /** Maximum results per entity kind. Providers may cap this lower. */
  limit?: number;
}

export interface ProviderTrack {
  providerId: string;
  externalId: string;
  title: string;
  artistName: string;
  artistExternalId: string;
  albumTitle: string | null;
  albumExternalId: string | null;
  durationSeconds: number;
  artworkUrl: string | null;
}

export interface ProviderAlbum {
  providerId: string;
  externalId: string;
  title: string;
  artistName: string;
  artistExternalId: string;
  artworkUrl: string | null;
  /** ISO 8601 date string, or null if the provider doesn't report one. */
  releasedAt: string | null;
}

export interface ProviderArtist {
  providerId: string;
  externalId: string;
  name: string;
  imageUrl: string | null;
}

export interface ProviderSearchResult {
  tracks: ProviderTrack[];
  albums: ProviderAlbum[];
  artists: ProviderArtist[];
}

export interface ResolvedStream {
  url: string;
  /** ISO 8601 timestamp the URL stops being valid, or null if it doesn't expire. */
  expiresAt: string | null;
}

/**
 * The provider abstraction described in
 * docs/architecture/music-provider-architecture.md. A `MusicGateway`
 * (added in a later milestone) is the only thing in the backend allowed
 * to call implementations of this interface directly — every other
 * module goes through the Gateway.
 *
 * `getRelatedTracks` is optional because not every provider exposes a
 * related-content API; callers must capability-check
 * (`typeof provider.getRelatedTracks === 'function'`) rather than assume
 * it exists — recommendations treat this as an optional enrichment, never
 * a required dependency, per the same decisions doc.
 */
export interface MusicProvider {
  readonly providerId: string;

  search(query: string, options?: SearchOptions): Promise<ProviderSearchResult>;
  getTrack(externalId: string): Promise<ProviderTrack | null>;
  getAlbum(externalId: string): Promise<ProviderAlbum | null>;
  getArtist(externalId: string): Promise<ProviderArtist | null>;
  resolveStreamUrl(externalId: string): Promise<ResolvedStream>;
  getRelatedTracks?(externalId: string): Promise<ProviderTrack[]>;
}
