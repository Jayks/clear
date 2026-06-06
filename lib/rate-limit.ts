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

// ── Receipt scan limit — separate store, 20 scans / 24 hours ─────────────────
// Tracks AI vision calls specifically (distinct from the general AI rate limit).
// Uses a 24-hour window so the limit resets at roughly the same time each day.

const receiptScanStore = new Map<string, { count: number; resetAt: number }>();

const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCAN_LIMIT = 20;

export function checkReceiptScanLimit(userId: string): boolean {
  const now = Date.now();
  const entry = receiptScanStore.get(userId);

  if (!entry || now >= entry.resetAt) {
    receiptScanStore.set(userId, { count: 1, resetAt: now + SCAN_WINDOW_MS });
    return true;
  }

  if (entry.count >= SCAN_LIMIT) return false;

  entry.count++;
  return true;
}
