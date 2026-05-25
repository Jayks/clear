import { describe, it, expect } from "vitest";
import { applyRemoveMe, applyChangeShare, applySplitEqual } from "./split-transforms";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const s3 = [
  { memberId: "a", shareAmount: 333.34 },
  { memberId: "b", shareAmount: 333.33 },
  { memberId: "c", shareAmount: 333.33 },
];
const s2 = [
  { memberId: "a", shareAmount: 500 },
  { memberId: "b", shareAmount: 500 },
];
const s1 = [{ memberId: "a", shareAmount: 1000 }];
const total = (splits: { shareAmount: string }[]) =>
  splits.reduce((acc, s) => acc + Number(s.shareAmount), 0);

// ── applyRemoveMe ─────────────────────────────────────────────────────────────

describe("applyRemoveMe", () => {
  it("removes requester, redistributes equally among rest", () => {
    const r = applyRemoveMe(s3, 1000, "a");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.splits).toHaveLength(2);
    expect(r.splits.every((s) => s.memberId !== "a")).toBe(true);
    expect(total(r.splits)).toBeCloseTo(1000, 1);
  });

  it("2-way split: remaining member gets full amount", () => {
    const r = applyRemoveMe(s2, 1000, "b");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.splits).toHaveLength(1);
    expect(r.splits[0].memberId).toBe("a");
    expect(Number(r.splits[0].shareAmount)).toBeCloseTo(1000, 1);
  });

  it("fails when requester is the only member", () => {
    const r = applyRemoveMe(s1, 1000, "a");
    expect(r.ok).toBe(false);
  });

  it("fails when all members are the requester (empty remaining)", () => {
    const r = applyRemoveMe([{ memberId: "a", shareAmount: 1000 }], 1000, "a");
    expect(r.ok).toBe(false);
  });

  it("handles member not in splits (no-op: all stay)", () => {
    // Requester 'z' not in splits → all existing members remain, amount redistributed
    const r = applyRemoveMe(s2, 1000, "z");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.splits).toHaveLength(2);
    expect(total(r.splits)).toBeCloseTo(1000, 1);
  });

  it("preserves total with odd division (1000 among 3)", () => {
    const r = applyRemoveMe(
      [
        { memberId: "a", shareAmount: 250 },
        { memberId: "b", shareAmount: 250 },
        { memberId: "c", shareAmount: 250 },
        { memberId: "d", shareAmount: 250 },
      ],
      1000,
      "a"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.splits)).toBeCloseTo(1000, 1);
  });
});

// ── applyChangeShare ──────────────────────────────────────────────────────────

describe("applyChangeShare", () => {
  it("sets requester's exact share; others split remainder equally", () => {
    const r = applyChangeShare(s3, 1000, "a", 200);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const req = r.splits.find((s) => s.memberId === "a");
    expect(Number(req!.shareAmount)).toBeCloseTo(200, 1);
    expect(total(r.splits)).toBeCloseTo(1000, 1);
  });

  it("fails when suggestedAmount exceeds expense total", () => {
    const r = applyChangeShare(s3, 1000, "a", 1500);
    expect(r.ok).toBe(false);
  });

  it("fails when suggestedAmount is negative", () => {
    const r = applyChangeShare(s3, 1000, "a", -50);
    expect(r.ok).toBe(false);
  });

  it("suggestedAmount = 0: requester owes nothing, others split all", () => {
    const r = applyChangeShare(s2, 1000, "b", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const req = r.splits.find((s) => s.memberId === "b");
    expect(Number(req!.shareAmount)).toBe(0);
    const other = r.splits.find((s) => s.memberId === "a");
    expect(Number(other!.shareAmount)).toBeCloseTo(1000, 1);
  });

  it("suggestedAmount = full total: requester takes all, others get 0", () => {
    const r = applyChangeShare(s2, 1000, "a", 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const req = r.splits.find((s) => s.memberId === "a");
    expect(Number(req!.shareAmount)).toBeCloseTo(1000, 1);
    const other = r.splits.find((s) => s.memberId === "b");
    expect(Number(other!.shareAmount)).toBe(0);
  });

  it("rounding: 7-way split of remainder stays correct", () => {
    const s7 = Array.from({ length: 7 }, (_, i) => ({
      memberId: String(i),
      shareAmount: 1000 / 7,
    }));
    const r = applyChangeShare(s7, 1000, "0", 100);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.splits)).toBeCloseTo(1000, 1);
  });

  it("solo member: always gets full amount regardless of suggestedAmount", () => {
    const r = applyChangeShare(s1, 1000, "a", 400);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Only member — no others to split remainder with
    expect(r.splits).toHaveLength(1);
    expect(Number(r.splits[0].shareAmount)).toBeCloseTo(400, 1);
  });

  it("exact match to total is allowed", () => {
    const r = applyChangeShare(s2, 500, "a", 500);
    expect(r.ok).toBe(true);
  });
});

// ── applySplitEqual ───────────────────────────────────────────────────────────

describe("applySplitEqual", () => {
  it("splits equally among 3 members", () => {
    const r = applySplitEqual(s3, 900);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.splits).toHaveLength(3);
    expect(total(r.splits)).toBeCloseTo(900, 1);
    // Each share should be 300
    r.splits.forEach((s) => expect(Number(s.shareAmount)).toBeCloseTo(300, 1));
  });

  it("single member gets full amount", () => {
    const r = applySplitEqual(s1, 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number(r.splits[0].shareAmount)).toBeCloseTo(1000, 1);
  });

  it("fails for empty splits", () => {
    const r = applySplitEqual([], 1000);
    expect(r.ok).toBe(false);
  });

  it("handles non-divisible amount (rounding fix)", () => {
    // 100 / 3 → first gets 33.34, others get 33.33
    const r = applySplitEqual(s3, 100);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.splits)).toBeCloseTo(100, 1);
    // Verify rounding: exactly one member should have 33.34
    const amounts = r.splits.map((s) => Number(s.shareAmount));
    const high = amounts.filter((a) => Math.abs(a - 33.34) < 0.001).length;
    expect(high).toBe(1);
  });

  it("large group (8 members) preserves total", () => {
    const s8 = Array.from({ length: 8 }, (_, i) => ({
      memberId: String(i),
      shareAmount: 0,
    }));
    const r = applySplitEqual(s8, 3700);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.splits)).toBeCloseTo(3700, 1);
  });

  it("2p split of ₹1 each is exactly ₹0.50", () => {
    const r = applySplitEqual(s2, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.splits.forEach((s) => expect(Number(s.shareAmount)).toBeCloseTo(0.5, 2));
  });
});
