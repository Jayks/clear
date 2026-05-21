// In-memory rate limiter for AI actions.
// Per-user, shared across all AI features: 20 calls / hour.
// In serverless (Vercel) each function instance has its own store,
// so this is best-effort — sufficient for free-tier abuse prevention.

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const AI_LIMIT = 20;

export function checkAiRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now >= entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= AI_LIMIT) return false;

  entry.count++;
  return true;
}
