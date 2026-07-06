// Integration test against the REAL dev database. Round 16 fix #19:
// addExpense's notification fan-out was moved into afterSafe() (a wrapper
// around next/server's after() — see lib/after-safe.ts). next/server's
// after() throws "was called outside a request scope" when invoked outside
// a real Next.js request — which a Vitest integration test calling the
// action directly is. Verifies afterSafe() swallows that so addExpense
// still returns {ok:true} synchronously, exactly as before the fix.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
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
const { addExpense } = await import("@/app/actions/expenses");
const { eq } = await import("drizzle-orm");

describe("addExpense — Round 16 fix #19: afterSafe() doesn't break the sync return", () => {
  let groupId: string;
  let memberId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "After-Safe Test Trip (auto-cleaned)", groupType: "trip", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    const [member] = await db
      .insert(groupMembers)
      .values({ groupId, userId: TEST_USER_ID, displayName: "Tester", role: "admin" })
      .returning({ id: groupMembers.id });
    memberId = member.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("returns {ok:true, expenseId} even though after() has no real request scope here", async () => {
    const result = await addExpense({
      groupId,
      paidByMemberId: memberId,
      description: "Test expense",
      category: "food",
      amount: 100,
      currency: "INR",
      expenseDate: "2026-01-01",
      splitMode: "equal",
      splits: [{ memberId }],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.expenseId).toBeTruthy();
  });
});
