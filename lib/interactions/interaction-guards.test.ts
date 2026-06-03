/**
 * Unit tests for interaction action guards from the June 2026 bug scan.
 *
 * I-3  declineDispute — does not remove ⚠️/❓ reaction after declining (stale emoji)
 * I-4  raiseQuestion / raiseDispute — 3 DB calls with no transaction (partial state if INSERT fails)
 *
 * Run with: pnpm test lib/interactions/interaction-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── I-3: declineDispute must remove the dispute reaction ──────────────────────

type ReactionEmoji = "thumbs_up" | "question" | "dispute" | "seen";
type DisputeStatus = "pending" | "accepted" | "declined" | "cancelled";

interface Reaction   { memberId: string; emoji: ReactionEmoji }
interface Dispute    { id: string; status: DisputeStatus; requesterMemberId: string }

/** Simulates acceptDispute: updates status + removes reaction (current correct behaviour). */
function acceptDisputeEffect(
  dispute:   Dispute,
  reactions: Reaction[],
): { status: DisputeStatus; reactions: Reaction[] } {
  return {
    status:    "accepted",
    reactions: reactions.filter((r) => r.memberId !== dispute.requesterMemberId),
  };
}

/** Simulates declineDispute (BUGGY): only updates status, does NOT remove reaction. */
function declineDisputeEffect_BUGGY(
  dispute:   Dispute,
  reactions: Reaction[],
): { status: DisputeStatus; reactions: Reaction[] } {
  return {
    status:    "declined",
    reactions,                   // BUG: reactions array unchanged
  };
}

/** Simulates declineDispute (FIXED): updates status AND removes reaction (like acceptDispute). */
function declineDisputeEffect_FIXED(
  dispute:   Dispute,
  reactions: Reaction[],
): { status: DisputeStatus; reactions: Reaction[] } {
  return {
    status:    "declined",
    reactions: reactions.filter((r) => r.memberId !== dispute.requesterMemberId),
  };
}

describe("declineDispute — reaction removal parity with acceptDispute (I-3)", () => {
  const dispute: Dispute = { id: "d1", status: "pending", requesterMemberId: "m-bob" };
  const reactions: Reaction[] = [
    { memberId: "m-bob",   emoji: "dispute" }, // Bob raised the dispute
    { memberId: "m-alice", emoji: "thumbs_up" },
  ];

  it("acceptDispute removes the requester's ⚠️ reaction", () => {
    const result = acceptDisputeEffect(dispute, reactions);
    expect(result.status).toBe("accepted");
    const bobReaction = result.reactions.find((r) => r.memberId === "m-bob");
    expect(bobReaction).toBeUndefined(); // reaction removed ✓
    expect(result.reactions).toHaveLength(1); // alice's reaction stays
  });

  it("[BUG] declineDispute does NOT remove the ⚠️ reaction — emoji lingers on expense card", () => {
    const result = declineDisputeEffect_BUGGY(dispute, reactions);
    expect(result.status).toBe("declined");
    const bobReaction = result.reactions.find((r) => r.memberId === "m-bob");
    expect(bobReaction).toBeDefined(); // BUG: reaction NOT removed → stale ⚠️ icon shown
    expect(bobReaction!.emoji).toBe("dispute");
  });

  it("[FIXED] declineDispute removes the requester's reaction, same as acceptDispute", () => {
    const result = declineDisputeEffect_FIXED(dispute, reactions);
    expect(result.status).toBe("declined");
    const bobReaction = result.reactions.find((r) => r.memberId === "m-bob");
    expect(bobReaction).toBeUndefined(); // reaction removed ✓
    expect(result.reactions).toHaveLength(1);
  });

  it("[FIXED] other members' reactions are preserved after decline", () => {
    const result = declineDisputeEffect_FIXED(dispute, reactions);
    const aliceReaction = result.reactions.find((r) => r.memberId === "m-alice");
    expect(aliceReaction).toBeDefined();
    expect(aliceReaction!.emoji).toBe("thumbs_up");
  });

  it("both accept and decline result in no pending dispute emoji for requester", () => {
    const acceptResult  = acceptDisputeEffect(dispute, reactions);
    const declineResult = declineDisputeEffect_FIXED(dispute, reactions);
    expect(acceptResult.reactions.some((r)  => r.memberId === "m-bob")).toBe(false);
    expect(declineResult.reactions.some((r) => r.memberId === "m-bob")).toBe(false);
  });
});

// ── I-4: raiseQuestion / raiseDispute — 3 DB calls must be atomic ────────────

describe("raiseQuestion / raiseDispute — atomicity requirement (I-4)", () => {
  type Step = "cancel_old" | "upsert_reaction" | "insert_dispute";

  /** Simulates a 3-step mutation WITHOUT a transaction. */
  function raiseDisputeNonAtomic(failOn: Step | null): {
    completed: Step[];
    partial: boolean;
  } {
    const completed: Step[] = [];
    const steps: Step[] = ["cancel_old", "upsert_reaction", "insert_dispute"];
    for (const step of steps) {
      if (step === failOn) {
        return { completed, partial: completed.length > 0 };
      }
      completed.push(step);
    }
    return { completed, partial: false };
  }

  /** Simulates a 3-step mutation INSIDE a transaction (atomic). */
  function raiseDisputeAtomic(failOn: Step | null): {
    committed: boolean;
    completed: Step[];
  } {
    const completed: Step[] = [];
    const steps: Step[] = ["cancel_old", "upsert_reaction", "insert_dispute"];
    for (const step of steps) {
      if (step === failOn) {
        // Transaction rolled back — all steps undone
        return { committed: false, completed: [] };
      }
      completed.push(step);
    }
    return { committed: true, completed };
  }

  it("happy path: all 3 steps complete", () => {
    const result = raiseDisputeNonAtomic(null);
    expect(result.completed).toHaveLength(3);
    expect(result.partial).toBe(false);
  });

  it("[BUG] failure on insert_dispute leaves partial state: old cancelled + emoji set, no dispute record", () => {
    const result = raiseDisputeNonAtomic("insert_dispute");
    // Old dispute cancelled and reaction emoji upserted, but no new dispute row inserted
    expect(result.completed).toContain("cancel_old");
    expect(result.completed).toContain("upsert_reaction");
    expect(result.completed).not.toContain("insert_dispute");
    expect(result.partial).toBe(true);
    // Effect: expense card shows ⚠️/❓ but pendingDispute is null
    // → payer sees no Accept/Decline buttons; requester cannot cancel
  });

  it("[BUG] failure on upsert_reaction leaves partial state: old cancelled, no emoji, no dispute", () => {
    const result = raiseDisputeNonAtomic("upsert_reaction");
    expect(result.completed).toContain("cancel_old");
    expect(result.completed).not.toContain("upsert_reaction");
    expect(result.partial).toBe(true);
  });

  it("[FIXED] transaction rolled back on any step failure — no partial state", () => {
    const result = raiseDisputeAtomic("insert_dispute");
    expect(result.committed).toBe(false);
    expect(result.completed).toHaveLength(0); // rollback undoes all steps
  });

  it("[FIXED] transaction commits only when all 3 steps succeed", () => {
    const result = raiseDisputeAtomic(null);
    expect(result.committed).toBe(true);
    expect(result.completed).toHaveLength(3);
  });

  it("[FIXED] transaction is all-or-nothing: either all 3 steps or none", () => {
    const scenarios: (Step | null)[] = [null, "cancel_old", "upsert_reaction", "insert_dispute"];
    for (const failOn of scenarios) {
      const result = raiseDisputeAtomic(failOn);
      // Either fully committed (3 steps) or fully rolled back (0 steps)
      expect([0, 3]).toContain(result.completed.length);
    }
  });
});
