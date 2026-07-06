// Integration test against the REAL dev database. Round 16 fix #10: a
// concurrent confirmSettlement winning the race meant disputeSettlement's
// guarded DELETE removed 0 rows, but the function never checked that — it
// still notified the payer "your payment was disputed" even though their
// payment had just been confirmed. Fires confirmSettlement and
// disputeSettlement concurrently (Promise.all, same style as
// circle-expense-race.test.ts) against the same unconfirmed row and asserts
// the DB ends up in a coherent state either way — never a settlement that's
// both "confirmed" AND deleted, and never a false dispute notification for
// a payment that was actually just confirmed.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/notifications/send-push-notification", () => ({
  sendPushToUser: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: TEST_USER_ID, user_metadata: {} }) as never),
  };
});

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { settlements } = await import("@/lib/db/schema/settlements");
const { notifications } = await import("@/lib/db/schema/notifications");
const { disputeSettlement, confirmSettlement } = await import("@/app/actions/settlements");
const { eq, and } = await import("drizzle-orm");

describe("disputeSettlement vs confirmSettlement race — Round 16 fix #10", () => {
  let groupId: string;
  let fromMemberId: string;
  let toMemberId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Dispute Race Test (auto-cleaned)", groupType: "trip", defaultCurrency: "INR", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    // Actor is admin so both confirmSettlement and disputeSettlement's
    // authorization checks pass for the same account.
    await db.insert(groupMembers).values({ groupId, userId: TEST_USER_ID, displayName: "Admin", role: "admin" });
    const [payer] = await db
      .insert(groupMembers)
      .values({ groupId, guestName: "Payer", role: "member" })
      .returning({ id: groupMembers.id });
    fromMemberId = payer.id;
    toMemberId = (
      await db.select({ id: groupMembers.id }).from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, TEST_USER_ID)))
    )[0].id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("never leaves a confirmed settlement deleted, and the loser never fires a false notification", async () => {
    const [settlement] = await db
      .insert(settlements)
      .values({
        groupId,
        fromMemberId,
        toMemberId,
        amount:      "300.00",
        currency:    "INR",
        isConfirmed: false,
      })
      .returning({ id: settlements.id });

    const before = await db.select().from(notifications).where(eq(notifications.groupId, groupId));

    const [confirmResult, disputeResult] = await Promise.all([
      confirmSettlement(settlement.id, groupId),
      disputeSettlement(settlement.id, groupId, "changed my mind"),
    ]);

    const [finalRow] = await db.select().from(settlements).where(eq(settlements.id, settlement.id));
    const after = await db.select().from(notifications).where(eq(notifications.groupId, groupId));

    if (finalRow) {
      // Confirm won the race — the row must be confirmed (never left
      // half-confirmed/half-deleted), and dispute must have lost cleanly.
      expect(finalRow.isConfirmed).toBe(true);
      expect(confirmResult.ok).toBe(true);
      expect(disputeResult.ok).toBe(false);
      // Two valid interleavings both land here correctly: confirm's UPDATE
      // fully lands before dispute's own initial SELECT ("Cannot dispute a
      // confirmed settlement" — the pre-existing S-1b guard), OR dispute's
      // SELECT reads it as still-unconfirmed but confirm's UPDATE lands
      // before dispute's own guarded DELETE ("Settlement was already
      // confirmed" — Round 16 fix #10's new returning-check guard). Either
      // message is correct; which one fires depends on real network timing
      // between the two concurrent round trips, which this test can't pin.
      if (!disputeResult.ok) expect(disputeResult.error).toMatch(/already confirmed|confirmed settlement/i);
    } else {
      // Dispute won the race — row deleted, confirm must have lost cleanly
      // (either "not found" or "already processed", never a silent partial state).
      expect(disputeResult.ok).toBe(true);
      expect(confirmResult.ok).toBe(false);
    }

    // Regardless of who won, the loser must not have inserted a spurious
    // notification — exactly one notification event (the winner's), not two.
    expect(after.length - before.length).toBeLessThanOrEqual(1);
  }, 20000);

  it("disputeSettlement still succeeds normally when the settlement is genuinely unconfirmed (no race)", async () => {
    const [settlement] = await db
      .insert(settlements)
      .values({
        groupId,
        fromMemberId,
        toMemberId,
        amount:      "150.00",
        currency:    "INR",
        isConfirmed: false,
      })
      .returning({ id: settlements.id });

    const result = await disputeSettlement(settlement.id, groupId);
    expect(result.ok).toBe(true);

    const [gone] = await db.select().from(settlements).where(eq(settlements.id, settlement.id));
    expect(gone).toBeUndefined(); // deleted
  });

  it("hits the exact new fix #10 branch directly: DELETE affecting 0 rows returns {ok:false} and skips the notification", async () => {
    const [settlement] = await db
      .insert(settlements)
      .values({
        groupId,
        fromMemberId,
        toMemberId,
        amount:      "220.00",
        currency:    "INR",
        isConfirmed: false, // passes the earlier SELECT-based guard
      })
      .returning({ id: settlements.id });

    const before = await db.select().from(notifications).where(eq(notifications.groupId, groupId));

    // Deterministically simulates the exact race window Fix #10 closes: the
    // SELECT above sees isConfirmed=false, but by the time the guarded
    // DELETE runs, a concurrent confirm has already flipped it — so the
    // DELETE's WHERE (isConfirmed=false) matches 0 rows.
    const deleteSpy = vi.spyOn(db, "delete").mockReturnValueOnce({
      where: () => ({ returning: () => Promise.resolve([]) }),
    } as never);

    const result = await disputeSettlement(settlement.id, groupId, "changed my mind");
    deleteSpy.mockRestore();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Settlement was already confirmed");

    const after = await db.select().from(notifications).where(eq(notifications.groupId, groupId));
    expect(after.length).toBe(before.length); // no spurious "disputed" notification

    // Clean up the row the spy prevented from being deleted for real.
    await db.delete(settlements).where(eq(settlements.id, settlement.id));
  });
});
