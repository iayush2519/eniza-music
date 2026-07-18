import { create } from 'zustand';

import { getHasSeenOnboarding, setHasSeenOnboarding } from '@/lib/onboarding-storage';

/**
 * Whether the first-launch onboarding flow has been completed.
 * Deliberately a separate store from `useAuthStore` — "has this device
 * seen onboarding" and "is there a logged-in user" are independent
 * facts with independent lifecycles (onboarding is permanent per
 * install; auth state changes on every login/logout), and conflating
 * them into one store would make each harder to reason about on its own.
 */
type OnboardingState = {
  hasSeenOnboarding: boolean;
  /** True once the persisted flag has been read at least once — lets
   * the UI wait for this before deciding whether to show onboarding,
   * the same pattern `useAuthStore.isBootstrapped` uses for the session
   * check. */
  isLoaded: boolean;

  load: () => Promise<void>;
  complete: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoaded: false,

  load: async () => {
    const hasSeenOnboarding = await getHasSeenOnboarding();
    set({ hasSeenOnboarding, isLoaded: true });
  },

  complete: async () => {
    await setHasSeenOnboarding();
    set({ hasSeenOnboarding: true });
  },
}));
