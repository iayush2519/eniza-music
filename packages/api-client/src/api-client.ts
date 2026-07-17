import { AuthClient } from './clients/auth.client';
import { CatalogClient } from './clients/catalog.client';
import { LibraryClient } from './clients/library.client';
import { PlaybackClient } from './clients/playback.client';
import { RecommendationsClient } from './clients/recommendations.client';
import { SearchClient } from './clients/search.client';
import { HttpClient } from './http-client';
import { AuthTokenStore, createInMemoryTokenStore } from './token-store';

export type ApiClientOptions = {
  baseUrl: string;
  /** Defaults to an in-memory store; `apps/mobile` supplies a real
   * SecureStore-backed implementation (see docs/architecture/state-management.md). */
  tokenStore?: AuthTokenStore;
};

/**
 * The single entry point `apps/mobile` (and any future client) uses to
 * talk to the backend. Groups endpoints by domain (`auth`, `catalog`,
 * `library`, `search`, `playback`, `recommendations`) rather than
 * exposing one flat method list, mirroring the backend's own module
 * boundaries (`docs/architecture/backend-architecture.md`) so the
 * client-side structure doesn't drift from the server-side one.
 */
export class ApiClient {
  readonly auth: AuthClient;
  readonly catalog: CatalogClient;
  readonly library: LibraryClient;
  readonly search: SearchClient;
  readonly playback: PlaybackClient;
  readonly recommendations: RecommendationsClient;

  constructor(options: ApiClientOptions) {
    const tokenStore = options.tokenStore ?? createInMemoryTokenStore();
    const http = new HttpClient({ baseUrl: options.baseUrl, tokenStore });

    this.auth = new AuthClient(http, tokenStore);
    this.catalog = new CatalogClient(http);
    this.library = new LibraryClient(http);
    this.search = new SearchClient(http);
    this.playback = new PlaybackClient(http);
    this.recommendations = new RecommendationsClient(http);
  }
}
