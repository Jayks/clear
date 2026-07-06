// Integration test against the REAL dev database. Round 16 fix #8:
// confirmExternalPayment's claim → settlement INSERT → request final UPDATE
// now all run inside ONE transaction (via the extracted
// insertConfirmedSettlement core), so a failure partway through rolls
// EVERYTHING back — including the payment_requests claim — instead of
// stranding the request in `confirming` forever (no code path accepted that
// status before this fix).
//
// A genuine crash/timeout mid-transaction is impractical to simulate in
// vitest (per BUG_FIX_ROUND16_PLAN.md's own note), so this asserts the
// invariant SHAPE instead: forcing the settlement INSERT to fail (via a
// nonexistent member id — the settlements table's FK constraint on
// from_member_id/to_member_id rejects it) inside the exact same
// claim+insert+finalize transaction shape confirmExternalPayment uses, then
// verifying the payment_requests claim was rolled back to `self_reported`
// with no `confirming` residue.
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { paymentRequests } = await import("@/lib/db/schema/payment-requests");
const { insertConfirmedSettlement } = await import("./insert-settlement");
const { eq, and } = await import("drizzle-orm");

const ADMIN_USER_ID = crypto.randomUUID();

describe("insertConfirmedSettlement inside a confirmExternalPayment-shaped transaction — atomicity", () => {
  let groupId: string;
  let payerMemberId: string;
  let requestId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Settlement Atomicity Test (auto-cleaned)", groupType: "trip", defaultCurrency: "INR", createdBy: ADMIN_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    await db.insert(groupMembers).values({ groupId, userId: ADMIN_USER_ID, displayName: "Admin", role: "admin" });
    const [payer] = await db
      .insert(groupMembers)
      .values({ groupId, guestName: "Payer", role: "member" })
      .returning({ id: groupMembers.id });
    payerMemberId = payer.id;

    const [request] = await db
      .insert(paymentRequests)
      .values({
        contextType:     "trip",
        groupId,
        groupName:       "Settlement Atomicity Test",
        amount:          "500.00",
        currency:        "INR",
        payerName:       "Payer",
        payerMemberId,
        payeeUserId:     ADMIN_USER_ID,
        payeeName:       "Admin",
        status:          "self_reported",
        createdByUserId: ADMIN_USER_ID,
        expiresAt:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: paymentRequests.id });
    requestId = request.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("rolls back the claim when the settlement INSERT fails partway through the transaction", async () => {
    const nonexistentMemberId = crypto.randomUUID(); // valid UUID shape, no such group_members row

    await expect(
      db.transaction(async (tx) => {
        // Same claim shape as confirmExternalPayment's trip/nest branch.
        const [claimed] = await tx
          .update(paymentRequests)
          .set({ status: "confirming" })
          .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "self_reported")))
          .returning({ id: paymentRequests.id });
        expect(claimed).toBeDefined();

        // This INSERT fails — toMemberId doesn't exist, violating the FK
        // constraint on settlements.to_member_id.
        await insertConfirmedSettlement(tx, {
          groupId,
          fromMemberId: payerMemberId,
          toMemberId:   nonexistentMemberId,
          amount:       500,
          currency:     "INR",
        });

        // Never reached — the INSERT above throws.
        await tx.update(paymentRequests).set({ status: "confirmed" }).where(eq(paymentRequests.id, requestId));
      }),
    ).rejects.toThrow();

    // The invariant: no `confirming` residue. The claim was rolled back
    // along with the failed insert, atomically.
    const [after] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, requestId));
    expect(after.status).toBe("self_reported");
  });
});
