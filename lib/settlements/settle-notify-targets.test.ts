/**
 * Unit tests for `resolveSettleNotifyTargets` — the notification-target rule for
 * self-reported group settlements.
 *
 * Bug (Phase 3a, found 2026-06-15): in `selfReportSettlement` the "Payment
 * reported" push targeted only `toMember.userId`. When the creditor is a
 * ghost/guest member (`userId === null`) the guard was skipped and **nobody** was
 * notified — yet for a ghost creditor only the admin can confirm, so the
 * settlement sat silently pending. Fix mirrors Circle's `selfReportContribution`:
 * fall back to the group admin(s).
 *
 * Run with: pnpm test lib/settlements/settle-notify-targets.test.ts
 */

import { describe, it, expect } from "vitest";
import { resolveSettleNotifyTargets } from "./settle-notify-targets";

describe("resolveSettleNotifyTargets", () => {
  // ── Clear-user creditor → notify the creditor directly ──────────────────────

  it("clear-account creditor → notifies the creditor, not admins", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: "user-bob",
      adminUserIds: ["user-alice"], // admin is a different person — irrelevant here
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("creditor");
    expect(result.targetUserIds).toEqual(["user-bob"]);
  });

  it("clear-account creditor who is also the admin → still just the creditor", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: "user-alice",
      adminUserIds: ["user-alice"],
      reporterUserId: "user-bob",
    });
    expect(result.kind).toBe("creditor");
    expect(result.targetUserIds).toEqual(["user-alice"]);
  });

  // ── Ghost creditor → fall back to admin(s) (the bug fix) ────────────────────

  it("[FIX] ghost creditor → falls back to the single admin", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null, // ghost — cannot confirm
      adminUserIds: ["user-alice"],
      reporterUserId: "user-charlie", // non-admin debtor
    });
    expect(result.kind).toBe("admin_fallback");
    expect(result.targetUserIds).toEqual(["user-alice"]);
  });

  it("[FIX] ghost creditor → notifies every admin in the group", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: ["user-alice", "user-dora"],
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("admin_fallback");
    expect(result.targetUserIds).toEqual(["user-alice", "user-dora"]);
  });

  it("ghost creditor → reporter is excluded from the admin fallback (no self-notify)", () => {
    // Defensive: an admin self-reporting to a ghost would normally use
    // recordSettlement (auto-confirmed), but if they reach this path we must not
    // notify them about their own report.
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: ["user-alice", "user-charlie"], // charlie is also the reporter
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("admin_fallback");
    expect(result.targetUserIds).toEqual(["user-alice"]);
  });

  it("ghost creditor → duplicate admin userIds are deduped", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: ["user-alice", "user-alice"],
      reporterUserId: "user-charlie",
    });
    expect(result.targetUserIds).toEqual(["user-alice"]);
  });

  it("ghost creditor → null/ghost admins are dropped", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: [null, "user-alice", null],
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("admin_fallback");
    expect(result.targetUserIds).toEqual(["user-alice"]);
  });

  // ── Degenerate cases → "none" (no crash, nobody pushed) ─────────────────────

  it("ghost creditor + sole admin is the reporter → none (nobody to notify)", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: ["user-charlie"],
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("none");
    expect(result.targetUserIds).toEqual([]);
  });

  it("ghost creditor + no admins with accounts → none", () => {
    const result = resolveSettleNotifyTargets({
      creditorUserId: null,
      adminUserIds: [null],
      reporterUserId: "user-charlie",
    });
    expect(result.kind).toBe("none");
    expect(result.targetUserIds).toEqual([]);
  });
});
