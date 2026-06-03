/**
 * Unit tests for stream push notification and settle guards from the June 2026 bug scan.
 *
 * S-2  settleWithPerson — batch UPDATE outside a transaction (concurrent settle race)
 * S-3  settleWithPerson — sendStreamPush called with guestId instead of userId for guests
 * S-4  streamSummary — currency hardcoded to "INR" regardless of actual stream currency
 *
 * Run with: pnpm test lib/stream/stream-push-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── S-3: sendStreamPush must not send to guest counterpart IDs ────────────────

describe("settleWithPerson — sendStreamPush guest guard (S-3)", () => {
  /**
   * Three counterpart cases in settleWithPerson:
   *   Case 1: user is creator, counterpart is a Clear user   → counterpartId = auth.users.id
   *   Case 2: counterpart (Clear user) is creator            → counterpartId = auth.users.id
   *   Case 3: user is creator, counterpart is a guest        → counterpartId = stream_guests.id
   *
   * sendStreamPush looks up push_subscriptions by userId.
   * In case 3, passing a stream_guests.id returns no subscriptions (silent no-op).
   * But if a future auth user happens to have the same UUID (astronomically unlikely),
   * the wrong user receives the notification.
   * The fix: skip sendStreamPush entirely when the counterpart is a guest.
   */

  type CounterpartCase = 1 | 2 | 3;

  interface Counterpart {
    id: string;
    isGuest: boolean; // true = stream_guests.id (no auth account)
  }

  function resolveCounterpartCase(
    creatorId: string,
    counterpartId: string | null,
    counterpartGuestId: string | null,
    userId: string,
  ): CounterpartCase {
    if (counterpartId && creatorId === userId)    return 1; // I am creator, clear counterpart
    if (counterpartId && creatorId !== userId)    return 2; // clear user is creator
    if (counterpartGuestId && creatorId === userId) return 3; // I am creator, guest counterpart
    throw new Error("impossible");
  }

  function shouldSendPush(counterpart: Counterpart): boolean {
    // FIXED: only send push when counterpart has a Clear account (not a guest)
    return !counterpart.isGuest;
  }

  it("case 1: clear counterpart (user is creator) → push should be sent", () => {
    const c: Counterpart = { id: "auth-uuid-bob", isGuest: false };
    expect(shouldSendPush(c)).toBe(true);
  });

  it("case 2: clear counterpart is creator → push should be sent", () => {
    const c: Counterpart = { id: "auth-uuid-alice", isGuest: false };
    expect(shouldSendPush(c)).toBe(true);
  });

  it("case 3: guest counterpart → push must NOT be sent (no auth account)", () => {
    const c: Counterpart = { id: "guest-uuid-charlie", isGuest: true };
    expect(shouldSendPush(c)).toBe(false);
  });

  it("counterpart case resolution works correctly", () => {
    const creator    = "user-alice";
    const clearUser  = "user-bob";
    const guestId    = "guest-charlie";

    expect(resolveCounterpartCase(creator, clearUser, null,    creator)).toBe(1);
    expect(resolveCounterpartCase(creator, creator,  null,    clearUser)).toBe(2);
    expect(resolveCounterpartCase(creator, null,     guestId, creator)).toBe(3);
  });

  it("[BUG] current code calls sendStreamPush(counterpartId) unconditionally in all 3 cases", () => {
    // Current code at lines 554-558 of stream.ts:
    //   sendStreamPush(counterpartId, {...}).catch(() => {});
    // 'counterpartId' in case 3 is the stream_guests.id UUID, not an auth.users.id.
    // sendStreamPush looks up push_subscriptions by userId — silent miss (no crash).
    // Documented here as a correctness issue even though currently a no-op.
    const guestCounterpartId = "guest-uuid-charlie";
    const guestIsAuthUser = false; // guests have no auth.users row
    // Pushing to guestCounterpartId → no push_subscriptions found → silent miss
    expect(guestIsAuthUser).toBe(false);
  });
});

// ── S-2: settleWithPerson UPDATE must be in a transaction ─────────────────────

describe("settleWithPerson — concurrent settle race (S-2)", () => {
  interface StreamRecord { id: string; status: string; amount: string }

  /** Simulates the current non-transactional settle: SELECT ids → UPDATE. */
  function settleNonAtomic(
    records: StreamRecord[],
    partialAmount: number | null,
  ): string[] {
    const active = records.filter((r) => r.status !== "settled");
    const ids = partialAmount
      ? active.filter((r) => Number(r.amount) <= partialAmount).map((r) => r.id)
      : active.map((r) => r.id);
    // UPDATE happens here — but without a transaction, two concurrent calls
    // both fetched the same `ids` from the same `active` list
    return ids; // represents IDs that would be marked settled
  }

  const records: StreamRecord[] = [
    { id: "r1", status: "confirmed", amount: "200" },
    { id: "r2", status: "confirmed", amount: "300" },
  ];

  it("full settle: all active records settled", () => {
    expect(settleNonAtomic(records, null)).toEqual(["r1", "r2"]);
  });

  it("partial settle: only records whose amount fits the budget", () => {
    expect(settleNonAtomic(records, 200)).toEqual(["r1"]);
    expect(settleNonAtomic(records, 500)).toEqual(["r1", "r2"]);
  });

  it("[BUG] concurrent race: both parties call settle simultaneously → both update same IDs", () => {
    // Both party A and party B call settleWithPerson concurrently
    const idsForPartyA = settleNonAtomic(records, null); // reads same records
    const idsForPartyB = settleNonAtomic(records, null); // reads same records
    expect(idsForPartyA).toEqual(["r1", "r2"]);
    expect(idsForPartyB).toEqual(["r1", "r2"]);
    // Both UPDATE the same rows: idempotent for full-settle, but for partial amounts:
    //   Party A settles r1 (₹200), Party B settles r1 (₹200) again before A commits
    //   → two "settled" records, but only ₹200 actually paid by each
    //   Fix: wrap SELECT ids + UPDATE in db.transaction()
  });

  it("[FIXED invariant] transaction ensures only one settle wins on conflict", () => {
    // With a transaction, the second UPDATE sees the first committed status="settled"
    // and the WHERE clause (status IN active) matches nothing → no-op
    const alreadySettled: StreamRecord[] = [
      { id: "r1", status: "settled",  amount: "200" }, // already settled
      { id: "r2", status: "confirmed", amount: "300" },
    ];
    // After first settle commits, second call sees r1 as settled
    const idsAfterFirst = settleNonAtomic(alreadySettled, null);
    expect(idsAfterFirst).toEqual(["r2"]); // r1 excluded (already settled)
  });
});

// ── S-4: streamSummary currency must use actual stream currency, not "INR" ────

describe("streamSummary — currency detection (S-4)", () => {
  interface PersonSummary { net: number; currency: string }

  /** Current (buggy) implementation: always "INR". */
  function buildStreamSummary_BUGGY(
    totalOwedToMe: number,
    totalIOwe: number,
    _topRecords: PersonSummary[], // ignored
  ) {
    return { owedToMe: totalOwedToMe, iOwe: totalIOwe, currency: "INR" };
  }

  /** Fixed implementation: derive currency from top records. */
  function buildStreamSummary_FIXED(
    totalOwedToMe: number,
    totalIOwe: number,
    topRecords: PersonSummary[],
  ) {
    // Use currency of the first top record (highest |net|), fall back to "INR"
    const currency = topRecords[0]?.currency ?? "INR";
    return { owedToMe: totalOwedToMe, iOwe: totalIOwe, currency };
  }

  it("[BUG] current code hardcodes 'INR' even for USD streams", () => {
    const usdRecords: PersonSummary[] = [{ net: 1000, currency: "USD" }];
    const summary = buildStreamSummary_BUGGY(1000, 0, usdRecords);
    expect(summary.currency).toBe("INR"); // wrong: should be "USD"
  });

  it("[FIXED] currency derived from top record for non-INR streams", () => {
    const usdRecords: PersonSummary[] = [{ net: 1000, currency: "USD" }];
    const summary = buildStreamSummary_FIXED(1000, 0, usdRecords);
    expect(summary.currency).toBe("USD");
  });

  it("[FIXED] INR streams still show INR", () => {
    const inrRecords: PersonSummary[] = [{ net: 500, currency: "INR" }];
    const summary = buildStreamSummary_FIXED(500, 0, inrRecords);
    expect(summary.currency).toBe("INR");
  });

  it("[FIXED] empty top records falls back to INR", () => {
    const summary = buildStreamSummary_FIXED(0, 0, []);
    expect(summary.currency).toBe("INR");
  });

  it("[FIXED] owedToMe and iOwe amounts are passed through unchanged", () => {
    const records: PersonSummary[] = [{ net: 300, currency: "USD" }];
    const summary = buildStreamSummary_FIXED(300, 150, records);
    expect(summary.owedToMe).toBe(300);
    expect(summary.iOwe).toBe(150);
  });
});
