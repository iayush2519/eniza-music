import * as SecureStore from 'expo-secure-store';

const HAS_SEEN_ONBOARDING_KEY = 'onboarding.hasSeen';

/**
 * Whether the user has completed the onboarding flow at least once.
 *
 * This value is not a secret. `expo-secure-store` is used here purely
 * because it's the one persistent storage mechanism already installed
 * in this app (see `secure-token-store.ts`) — not because this flag
 * needs encryption at rest.
 *
 * docs/architecture/state-management.md's documented default for
 * non-secret persisted client state is MMKV, but MMKV is not installed
 * in this workspace and wasn't part of this milestone's approved
 * dependency list. Introducing a new native storage dependency solely
 * for one boolean flag isn't justified yet. Revisit this once MMKV is
 * introduced for a real multi-value use case (e.g. Phase 5's playback
 * queue/position persistence) and move this flag alongside it then.
 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING_KEY);
  return value === 'true';
}

export async function setHasSeenOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING_KEY, 'true');
}
