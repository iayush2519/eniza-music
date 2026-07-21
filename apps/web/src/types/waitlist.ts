export type WaitlistRole = 'listener' | 'artist' | 'investor' | 'other';

export type WaitlistSubmission = {
  name: string;
  email: string;
  role: WaitlistRole;
  message?: string;
};

export type WaitlistEntry = WaitlistSubmission & {
  id: string;
  submittedAt: string;
};

export type WaitlistServiceResult =
  | { ok: true; entry: WaitlistEntry }
  | { ok: false; error: string };

/**
 * Contract the waitlist form depends on. `src/lib/waitlist-service.ts`
 * is the only current implementation (localStorage-backed); a future
 * real backend integration means writing a new class/module against
 * this same interface and swapping the one import in
 * `waitlist-form.tsx` — no change to the form's validation or UI. See
 * the "WAITLIST" section of the original brief: "Keep architecture
 * ready for future backend integration."
 */
export type WaitlistService = {
  submit: (data: WaitlistSubmission) => Promise<WaitlistServiceResult>;
};
