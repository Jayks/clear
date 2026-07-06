// Integration test against the REAL dev database.
// Round 16 fix #2 + #9: duplicateExpense was admin-only (creators got "Not
// authorized" even though the UI offers Duplicate to creators), and dropped
// customCategory on the copy.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let currentUserId = "";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: currentUserId, user_metadata: {} }) as never),
  };
});

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { expenses } = await import("@/lib/db/schema/expenses");
const { duplicateExpense } = await import("@/app/actions/expenses");
const { eq } = await import("drizzle-orm");

describe("duplicateExpense — creator-or-admin authorization + customCategory carry-over", () => {
  let groupId: string;
  const adminUserId = crypto.randomUUID();
  const creatorUserId = crypto.randomUUID();
  const outsiderUserId = crypto.randomUUID();
  let payerMemberId: string;
  let expenseId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Duplicate Expense Test (auto-cleaned)", groupType: "trip", createdBy: adminUserId })
      .returning({ id: groups.id });
    groupId = group.id;

    await db.insert(groupMembers).values({ groupId, userId: adminUserId, displayName: "Admin", role: "admin" });
    await db.insert(groupMembers).values({ groupId, userId: creatorUserId, displayName: "Creator", role: "member" });
    await db.insert(groupMembers).values({ groupId, userId: outsiderUserId, displayName: "Outsider", role: "member" });

    const [payer] = await db
      .insert(groupMembers)
      .values({ groupId, guestName: "Payer Guest", role: "member" })
      .returning({ id: groupMembers.id });
    payerMemberId = payer.id;

    const [expense] = await db
      .insert(expenses)
      .values({
        groupId,
        paidByMemberId: payerMemberId,
        description: "Boat ride",
        category: "other",
        customCategory: "Boat ride",
        amount: "500.00",
        currency: "INR",
        expenseDate: "2026-01-01",
        createdByUserId: creatorUserId,
      })
      .returning({ id: expenses.id });
    expenseId = expense.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("allows the non-admin creator to duplicate their own expense", async () => {
    currentUserId = creatorUserId;
    const result = await duplicateExpense(expenseId);
    expect(result.ok).toBe(true);
  });

  it("carries customCategory over to the duplicate, and still nulls receipt fields", async () => {
    currentUserId = creatorUserId;
    const result = await duplicateExpense(expenseId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [copy] = await db.select().from(expenses).where(eq(expenses.id, result.expenseId));
    expect(copy.customCategory).toBe("Boat ride");
    expect(copy.receiptUrl).toBeNull();
    expect(copy.receiptItems).toBeNull();
    expect(copy.receiptScannedAt).toBeNull();
    expect(copy.description).toBe("Boat ride (copy)");
  });

  it("rejects a non-creator, non-admin member", async () => {
    currentUserId = outsiderUserId;
    const result = await duplicateExpense(expenseId);
    expect(result.ok).toBe(false);
  });

  it("still allows an admin to duplicate someone else's expense", async () => {
    currentUserId = adminUserId;
    const result = await duplicateExpense(expenseId);
    expect(result.ok).toBe(true);
  });
});
