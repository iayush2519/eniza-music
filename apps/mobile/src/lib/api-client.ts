import { ApiClient } from '@music-app/api-client';
import { Platform } from 'react-native';

import { createSecureTokenStore } from './secure-token-store';

/**
 * The backend base URL for local development.
 *
 * - Android emulators cannot reach the host machine via `localhost` —
 *   `10.0.2.2` is the documented emulator alias for the host loopback
 *   interface.
 * - iOS simulator and web both share the host's network namespace, so
 *   `localhost` resolves correctly there.
 *
 * A real deployment reads this from an environment-specific build config
 * instead of a platform check; that wiring is a Phase 9 (CI/CD &
 * deployment) concern and isn't introduced here, since there's no second
 * (staging/production) environment to point it at yet.
 */
const DEV_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const apiClient = new ApiClient({
  baseUrl: DEV_API_BASE_URL,
  tokenStore: createSecureTokenStore(),
});
