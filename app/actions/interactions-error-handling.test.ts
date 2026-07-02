// Integration test against the REAL dev database for setup (group/members/
// expense), with the `db` object's mutating methods temporarily spied to throw
// — verifies the audit fix: every interactions.ts mutation now returns
// { ok: false, error } instead of throwing past the caller's optimistic-UI
// rollback (expense-detail-sheet.tsx) on a transient DB failure.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

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
const { expenses } = await import("@/lib/db/schema/expenses");
const { expenseComments } = await import("@/lib/db/schema/expense-comments");
const { expenseDisputes } = await import("@/lib/db/schema/expense-disputes");
const {
  addReaction,
  raiseQuestion,
  raiseDispute,
  cancelMyDispute,
  addComment,
  deleteComment,
  declineDispute,
} = await import("@/app/actions/interactions");
const { eq, and } = await import("drizzle-orm");

describe("interactions.ts — DB failures return { ok: false } instead of throwing", () => {
  let groupId: string;
  let payerMemberId: string;
  let expenseId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Interactions Error Test (auto-cleaned)", groupType: "trip", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    // Actor is an admin (not the payer) so raiseQuestion/raiseDispute/declineDispute
    // are all permitted for the same fixture without extra setup.
    await db
      .insert(groupMembers)
      .values({ groupId, userId: TEST_USER_ID, displayName: "Actor", role: "admin" });

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
        description: "Test expense",
        category: "food",
        amount: "100.00",
        currency: "INR",
        expenseDate: "2026-01-01",
        createdByUserId: TEST_USER_ID,
      })
      .returning({ id: expenses.id });
    expenseId = expense.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades everything
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("addReaction returns ok:false (not a throw) when the insert fails", async () => {
    vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await addReaction(expenseId, groupId, "thumbs_up");
    expect(result.ok).toBe(false);
  });

  it("raiseQuestion returns ok:false when the transaction fails", async () => {
    vi.spyOn(db, "transaction").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await raiseQuestion(expenseId, groupId, "Why so expensive?");
    expect(result.ok).toBe(false);
  });

  it("raiseDispute returns ok:false when the transaction fails", async () => {
    vi.spyOn(db, "transaction").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await raiseDispute(expenseId, groupId, "split_equal");
    expect(result.ok).toBe(false);
  });

  it("cancelMyDispute returns ok:false when the transaction fails", async () => {
    vi.spyOn(db, "transaction").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await cancelMyDispute(expenseId, groupId);
    expect(result.ok).toBe(false);
  });

  it("addComment returns ok:false when the insert fails", async () => {
    vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await addComment(expenseId, groupId, "hello");
    expect(result.ok).toBe(false);
  });

  it("deleteComment returns ok:false when the delete fails, and the comment survives", async () => {
    const posted = await addComment(expenseId, groupId, "will be deleted");
    expect(posted.ok).toBe(true);

    const [comment] = await db
      .select({ id: expenseComments.id })
      .from(expenseComments)
      .where(eq(expenseComments.expenseId, expenseId));
    expect(comment).toBeDefined();

    vi.spyOn(db, "delete").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await deleteComment(comment.id, groupId);
    expect(result.ok).toBe(false);

    const [stillThere] = await db.select().from(expenseComments).where(eq(expenseComments.id, comment.id));
    expect(stillThere).toBeDefined();
  });

  it("declineDispute returns ok:false when the transaction fails, and the dispute stays pending", async () => {
    const raised = await raiseQuestion(expenseId, groupId, "Real question for decline test");
    expect(raised.ok).toBe(true);

    const [dispute] = await db
      .select({ id: expenseDisputes.id })
      .from(expenseDisputes)
      .where(and(eq(expenseDisputes.expenseId, expenseId), eq(expenseDisputes.status, "pending")));
    expect(dispute).toBeDefined();

    vi.spyOn(db, "transaction").mockImplementationOnce(() => {
      throw new Error("simulated DB failure");
    });
    const result = await declineDispute(dispute.id);
    expect(result.ok).toBe(false);

    const [stillPending] = await db
      .select({ status: expenseDisputes.status })
      .from(expenseDisputes)
      .where(eq(expenseDisputes.id, dispute.id));
    expect(stillPending.status).toBe("pending");
  });
});
