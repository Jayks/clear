/**
 * Error classification for page-load error boundaries.
 *
 * Deliberately conservative. In production Next.js strips server error messages
 * and replaces them with a `digest` hash, so the ONLY signal we can trust from
 * the client is `navigator.onLine === false` (reliable when false; NOT reliable
 * when true — it reports a network interface, not real connectivity).
 *
 * We therefore classify into two honest states rather than guessing at
 * server-vs-bug (which is indistinguishable from the client):
 *   - `offline`    — the device has no network interface
 *   - `generic`    — something failed; retrying usually fixes it
 *   - `persistent` — generic, but retries keep failing → escalate the copy
 *
 * This is a PURE function (online state is injected) so it is fully unit-testable
 * without a DOM. The `ErrorCard` component reads `navigator.onLine` and the retry
 * count, then passes them in.
 */

export type ErrorKind = "offline" | "generic" | "persistent";

export interface ClassifiedError {
  kind: ErrorKind;
  title: string;
  message: string;
}

/** Quick retries allowed before the copy escalates to "persistent". */
export const MAX_QUICK_RETRIES = 2;

export function classifyError(
  _error: (Error & { digest?: string }) | null | undefined,
  isOnline: boolean,
  attemptCount = 0,
): ClassifiedError {
  // Offline is the one signal we can trust — it takes priority over everything,
  // including a high retry count (retrying while offline can never succeed).
  if (!isOnline) {
    return {
      kind: "offline",
      title: "You're offline",
      message:
        "Check your internet connection — we'll retry automatically the moment you're back online.",
    };
  }

  if (attemptCount >= MAX_QUICK_RETRIES) {
    return {
      kind: "persistent",
      title: "Still having trouble",
      message:
        "This is taking longer than usual — it may be on our end. Please give it a minute and try again.",
    };
  }

  return {
    kind: "generic",
    title: "Something went wrong",
    message:
      "We couldn't load this page. This is usually temporary — please try again.",
  };
}
