// Integration test against the REAL dev database. Round 16 fix #14:
// getSettlementsTotal summed confirmed settlements with no currency filter —
// a stray non-default-currency settlement (shouldn't normally exist post the
// S-12 currency guard in recordSettlement/selfReportSettlement, but could
// predate it, or be seeded directly) would be summed in as if it were the
// default currency, inflating the "total settled" figure shown on the
// Settle Up page. Verifies the fix: a mixed-currency confirmed settlement is
// excluded from the total.
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { settlements } = await import("@/lib/db/schema/settlements");
const { getSettlementsTotal } = await import("./balances");
const { eq } = await import("drizzle-orm");

describe("getSettlementsTotal — currency filter (Round 16 fix #14)", () => {
  let groupId: string;
  let fromMemberId: string;
  let toMemberId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Settlements Total Currency Test (auto-cleaned)", groupType: "trip", defaultCurrency: "INR", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    const [payer] = await db
      .insert(groupMembers)
      .values({ groupId, guestName: "Payer", role: "member" })
      .returning({ id: groupMembers.id });
    fromMemberId = payer.id;
    const [payee] = await db
      .insert(groupMembers)
      .values({ groupId, guestName: "Payee", role: "member" })
      .returning({ id: groupMembers.id });
    toMemberId = payee.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("excludes a mixed-currency confirmed settlement from the total", async () => {
    await db.insert(settlements).values({
      groupId, fromMemberId, toMemberId,
      amount: "1000.00", currency: "INR", isConfirmed: true,
    });
    // Stray non-default-currency settlement — shouldn't count toward the
    // group's INR total.
    await db.insert(settlements).values({
      groupId, fromMemberId, toMemberId,
      amount: "500.00", currency: "USD", isConfirmed: true,
    });

    const total = await getSettlementsTotal(groupId, "INR");
    expect(total).toBe(1000);
  });

  it("excludes unconfirmed settlements regardless of currency (pre-existing behaviour, still green)", async () => {
    await db.delete(settlements).where(eq(settlements.groupId, groupId));
    await db.insert(settlements).values({
      groupId, fromMemberId, toMemberId,
      amount: "300.00", currency: "INR", isConfirmed: false,
    });

    const total = await getSettlementsTotal(groupId, "INR");
    expect(total).toBe(0);
  });
});
