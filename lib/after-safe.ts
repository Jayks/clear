import { after } from "next/server";

/**
 * `after()` throws "was called outside a request scope" when invoked outside
 * a real Next.js request lifecycle (e.g. a Vitest integration test calling a
 * server action directly, or any future script that imports one). In
 * production every Server Action genuinely runs inside a request, so this
 * only matters for tests — but since the call site (Round 16 fix #19,
 * `addExpense`) sits inside the action's own outer try/catch, an uncaught
 * throw there would silently turn a successful save into `{ ok: false }`.
 * Swallow it instead: the deferred callback is best-effort by design (same
 * "fails silently" posture as the callback's own internal `.catch(() => {})`s),
 * so skipping it entirely when there's no request scope to defer into is the
 * correct behavior, not a regression.
 */
export function afterSafe(fn: () => void | Promise<void>): void {
  try {
    after(fn);
  } catch {
    // No request scope (e.g. called directly from a test) — nothing to defer into.
  }
}
