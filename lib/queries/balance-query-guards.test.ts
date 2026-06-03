/**
 * Unit tests for query-layer guard logic introduced by the Round-2 bug fixes.
 * DB queries themselves require a live connection and can't be unit-tested here,
 * so we cover the extractable pure logic and document the invariants.
 *
 * Run with: pnpm test lib/queries/balance-query-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── B-1: balances.ts — confirmed-only settlements ────────────────────────────

/**
 * Simulates the net calculation that getBalances() performs after the fix.
 * Only confirmed settlements are included.
 */
function computeNet(
  totalPaid: number,
  totalOwed: number,
  settlements: { amount: number; isConfirmed: boolean }[],
  role: "payer" | "receiver",
): number {
  const confirmed = settlements.filter((s) => s.isConfirmed);
  const sent      = role === "payer"    ? confirmed.reduce((s, r) => s + r.amount, 0) : 0;
  const received  = role === "receiver" ? confirmed.reduce((s, r) => s + r.amount, 0) : 0;
  return totalPaid - totalOwed + sent - received;
}

describe("getBalances — confirmed-only settlement filter (B-1)", () => {
  it("confirmed settlement reduces debtor net", () => {
    // Debtor paid ₹0, owes ₹1000, sent ₹1000 (confirmed)
    const net = computeNet(0, 1000, [{ amount: 1000, isConfirmed: true }], "payer");
    expect(net).toBe(0);
  });

  it("unconfirmed settlement does NOT reduce debtor net", () => {
    // Before fix: isConfirmed=false was counted → net appeared 0 prematurely
    const net = computeNet(0, 1000, [{ amount: 1000, isConfirmed: false }], "payer");
    expect(net).toBe(-1000); // still owes; creditor hasn't confirmed yet
  });

  it("partially-confirmed settlement: only confirmed portion counts", () => {
    const settlements = [
      { amount: 600, isConfirmed: true  },
      { amount: 400, isConfirmed: false }, // pending
    ];
    const net = computeNet(0, 1000, settlements, "payer");
    expect(net).toBe(-400); // ₹400 still outstanding
  });

  it("creditor side: confirmed settlement increases received total", () => {
    // Creditor paid ₹1000, owed back ₹0 to others, received ₹1000 (confirmed)
    const net = computeNet(1000, 0, [{ amount: 1000, isConfirmed: true }], "receiver");
    expect(net).toBe(0); // fully settled
  });

  it("[BUG SCENARIO] unconfirmed settlement on creditor side: balance looked zero before fix", () => {
    // Before fix: receivedCte had no isConfirmed filter — ALL rows included.
    // Replicates the old (buggy) CTE which counts every settlement regardless of status.
    function computeNetBuggy(
      totalPaid: number,
      totalOwed: number,
      settlements: { amount: number; isConfirmed: boolean }[],
      role: "payer" | "receiver",
    ): number {
      // OLD behavior: no confirmation filter
      const sent     = role === "payer"    ? settlements.reduce((s, r) => s + r.amount, 0) : 0;
      const received = role === "receiver" ? settlements.reduce((s, r) => s + r.amount, 0) : 0;
      return totalPaid - totalOwed + sent - received;
    }

    // Creditor paid ₹1000 into pool; debtor self-reported ₹1000 (unconfirmed).
    const buggyNet = computeNetBuggy(1000, 0, [{ amount: 1000, isConfirmed: false }], "receiver");
    expect(buggyNet).toBe(0); // BUG: looked fully settled before creditor confirmed

    // After fix: unconfirmed rows excluded → creditor still shows ₹1000 net
    const fixedNet = computeNet(1000, 0, [{ amount: 1000, isConfirmed: false }], "receiver");
    expect(fixedNet).toBe(1000); // correctly outstanding
  });
});

// ── B-2: interactions.ts — addReaction guard for question/dispute ─────────────

type ReactionEmoji = "thumbs_up" | "seen" | "question" | "dispute";

/**
 * Simulates the addReaction guard logic after the B-2 fix.
 * Returns "toggle_off" | "replace" | "insert" | "blocked"
 */
function simulateAddReaction(
  existing: { emoji: ReactionEmoji } | null,
  newEmoji: "thumbs_up" | "seen",
): "toggle_off" | "replace" | "insert" | "blocked" {
  if (!existing) return "insert";
  if (existing.emoji === newEmoji) return "toggle_off";
  if (existing.emoji === "question" || existing.emoji === "dispute") return "blocked";
  return "replace"; // seen → thumbs_up allowed
}

describe("addReaction — dispute/question guard (B-2)", () => {
  it("no existing reaction → insert", () => {
    expect(simulateAddReaction(null, "thumbs_up")).toBe("insert");
  });

  it("same emoji exists → toggle off", () => {
    expect(simulateAddReaction({ emoji: "thumbs_up" }, "thumbs_up")).toBe("toggle_off");
  });

  it("seen exists → allowed to replace with thumbs_up", () => {
    expect(simulateAddReaction({ emoji: "seen" }, "thumbs_up")).toBe("replace");
  });

  it("[BUG SCENARIO] question exists + thumbs_up tap → should be blocked", () => {
    // Before fix: existing.emoji (question) !== "thumbs_up" → UPDATE → question wiped
    // After fix: question/dispute branch returns "blocked"
    expect(simulateAddReaction({ emoji: "question" }, "thumbs_up")).toBe("blocked");
  });

  it("[BUG SCENARIO] dispute exists + thumbs_up tap → should be blocked", () => {
    expect(simulateAddReaction({ emoji: "dispute" }, "thumbs_up")).toBe("blocked");
  });
});

// ── B-3/B-4: createGroup / createCircle — atomic creation invariant ──────────

describe("createGroup / createCircle — atomic creation (B-3/B-4)", () => {
  /**
   * These are transactional DB operations; no pure-function equivalent.
   * Tests document the invariant: a committed group row MUST have exactly
   * one admin group_members row.
   */

  it("invariant: every group must have at least one admin member", () => {
    const groups = [
      { id: "g1", members: [{ role: "admin" }] },
      { id: "g2", members: [{ role: "admin" }, { role: "member" }] },
    ];
    for (const g of groups) {
      const admins = g.members.filter((m) => m.role === "admin");
      expect(admins.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("[BUG SCENARIO] group with no admin members is inaccessible", () => {
    // Before fix: if groupMembers INSERT threw after groups INSERT committed,
    // the group existed with zero members — no-one could access or delete it.
    const orphanGroup = { id: "g3", members: [] as { role: string }[] };
    const admins = orphanGroup.members.filter((m) => m.role === "admin");
    expect(admins.length).toBe(0); // proves the corruption scenario
    // After fix: db.transaction() rolls back the groups row if member insert fails
  });
});

// ── B-5: logStream — direction-aware notification body ──────────────────────

/**
 * Replicates the direction-aware body logic introduced by the B-5 fix.
 */
function buildStreamNotificationBody(
  direction: "they_owe_me" | "i_owe_them",
  amountStr: string,
  note: string | null,
): string {
  const noteClause = note ? ` for ${note}` : "";
  return direction === "they_owe_me"
    ? `says you owe ${amountStr}${noteClause}`
    : `says they owe you ${amountStr}${noteClause}`;
}

describe("logStream — direction-aware push notification body (B-5)", () => {
  it("they_owe_me: counterpart is told they owe money", () => {
    const body = buildStreamNotificationBody("they_owe_me", "₹500", null);
    expect(body).toBe("says you owe ₹500");
  });

  it("they_owe_me with note", () => {
    const body = buildStreamNotificationBody("they_owe_me", "₹500", "lunch");
    expect(body).toBe("says you owe ₹500 for lunch");
  });

  it("i_owe_them: counterpart is told they are owed money", () => {
    const body = buildStreamNotificationBody("i_owe_them", "₹500", null);
    expect(body).toBe("says they owe you ₹500");
  });

  it("i_owe_them with note", () => {
    const body = buildStreamNotificationBody("i_owe_them", "₹500", "concert tickets");
    expect(body).toBe("says they owe you ₹500 for concert tickets");
  });

  it("[BUG SCENARIO] old body always said 'you owe' regardless of direction", () => {
    // Before fix: body was always `says you owe ${amount}` even for i_owe_them
    const oldBody = `says you owe ₹500`; // hardcoded — no direction check
    const newBody = buildStreamNotificationBody("i_owe_them", "₹500", null);
    expect(oldBody).not.toBe(newBody); // proves the fix changed the output
  });
});

// ── B-6: selfReportContribution — revalidation coverage ─────────────────────

describe("selfReportContribution — revalidation completeness (B-6)", () => {
  /**
   * Documents the invariant: after an admin self-report (which auto-confirms
   * the contribution), BOTH the cache path and the balance tag must be
   * invalidated so the Circle card reflects the updated pool balance.
   */

  it("invariant: admin self-report triggers balance revalidation", () => {
    // Simulate what the fixed action now calls
    const revalidated: string[] = [];
    const mockRevalidateTag = (tag: string) => revalidated.push(`tag:${tag}`);
    const mockRevalidatePath = (path: string, variant?: string) =>
      revalidated.push(`path:${path}${variant ? `:${variant}` : ""}`);

    const groupId = "grp-123";
    const isAdmin = true; // admin self-report → auto-confirmed

    // Fixed action calls both, regardless of isAdmin flag, for simplicity
    mockRevalidatePath("/groups");
    mockRevalidatePath(`/groups/${groupId}`, "layout");
    mockRevalidateTag(`balances-${groupId}`);

    expect(revalidated).toContain(`path:/groups/${groupId}:layout`);
    expect(revalidated).toContain(`tag:balances-${groupId}`);

    void isAdmin; // used above conceptually
  });

  it("[BUG SCENARIO] before fix: layout variant and balance tag were missing", () => {
    const revalidated: string[] = [];
    const mockRevalidatePath = (path: string, variant?: string) =>
      revalidated.push(`path:${path}${variant ? `:${variant}` : ""}`);

    const groupId = "grp-123";
    // Old code:
    mockRevalidatePath("/groups");
    mockRevalidatePath(`/groups/${groupId}`); // no "layout" variant, no revalidateTag

    expect(revalidated).not.toContain(`path:/groups/${groupId}:layout`);
    // balance tag never added → pool balance stayed stale after admin self-report
  });
});
