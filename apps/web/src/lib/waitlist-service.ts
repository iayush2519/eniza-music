import type {
  WaitlistEntry,
  WaitlistService,
  WaitlistServiceResult,
  WaitlistSubmission,
} from '@/types/waitlist';

const STORAGE_KEY = 'eniza-waitlist-submissions';

function readEntries(): WaitlistEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WaitlistEntry[]) : [];
  } catch {
    // Corrupt/foreign data in this key shouldn't crash the form —
    // treat it as an empty waitlist and let the next successful submit
    // overwrite it.
    return [];
  }
}

function writeEntries(entries: WaitlistEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Mock waitlist backend, implementing the `WaitlistService` contract
 * against `localStorage` instead of a real API — this is a marketing
 * site with no backend of its own (see the "IMPORTANT" scope note this
 * phase was built under: no auth, no dashboard, no backend). Kept behind
 * the same interface a real implementation would use
 * (`fetch('/api/waitlist', ...)` or a third-party form service) so
 * swapping it later is a one-file change, not a rewrite of the form.
 *
 * A small artificial delay is included to (a) let the form's loading
 * state actually be visible/testable, and (b) match the latency shape a
 * real network call would have, so the UI doesn't need to change when
 * this is swapped for a real backend.
 */
export const localWaitlistService: WaitlistService = {
  async submit(data: WaitlistSubmission): Promise<WaitlistServiceResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const entries = readEntries();
    const alreadyJoined = entries.some(
      (entry) => entry.email.toLowerCase() === data.email.toLowerCase(),
    );

    if (alreadyJoined) {
      return { ok: false, error: 'This email is already on the waitlist.' };
    }

    const entry: WaitlistEntry = {
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };

    writeEntries([...entries, entry]);
    return { ok: true, entry };
  },
};
