// Integration test against the REAL dev database (uses the DATABASE_URL from
// .env.local, loaded by vitest.config.ts). Verifies the FOR UPDATE lock fix in
// addCircleExpense actually prevents a concurrent wallet overdraw — a pure
// unit test can't exercise this since the bug only manifests under real
// concurrent Postgres transactions. See CLAUDE.md's noted "read before touching"
// caution for anything DB-concurrency related in this codebase.
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
const { circleContributions } = await import("@/lib/db/schema/circle-contributions");
const { expenses } = await import("@/lib/db/schema/expenses");
const { addCircleExpense } = await import("@/app/actions/circle");
const { eq } = await import("drizzle-orm");

describe("addCircleExpense — wallet overdraw race (live-DB integration)", () => {
  let groupId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({
        name: "Race Test Circle (auto-cleaned)",
        groupType: "circle",
        circleMode: "recurring",
        defaultCurrency: "INR",
        createdBy: TEST_USER_ID,
      })
      .returning({ id: groups.id });
    groupId = group.id;

    const [member] = await db
      .insert(groupMembers)
      .values({
        groupId,
        userId: TEST_USER_ID,
        displayName: "Race Tester",
        role: "admin",
      })
      .returning({ id: groupMembers.id });

    // Wallet starts with exactly ₹100 confirmed
    await db.insert(circleContributions).values({
      groupId,
      memberId: member.id,
      amount: "100.00",
      currency: "INR",
      isConfirmed: true,
    });
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades members/expenses/contributions
  });

  it("allows exactly one of two concurrent ₹60 draws against a ₹100 wallet, never overdrawing it", async () => {
    const input = {
      groupId,
      description: "Concurrent draw",
      category: "food",
      amount: 60,
      currency: "INR",
      expenseDate: "2026-01-01",
      isAdvance: false,
    };

    const [r1, r2] = await Promise.all([
      addCircleExpense(input as never),
      addCircleExpense(input as never),
    ]);

    const results = [r1, r2];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    const failure = failed[0];
    if (!failure.ok) expect(failure.error).toMatch(/wallet balance/i);

    // The real invariant: the wallet must never actually go negative in the DB,
    // regardless of what the two calls returned.
    const expenseRows = await db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(eq(expenses.groupId, groupId));
    const totalDrawn = expenseRows.reduce((s, r) => s + Number(r.amount), 0);
    expect(totalDrawn).toBeLessThanOrEqual(100.01);
    expect(totalDrawn).toBe(60); // exactly one of the two draws landed
  }, 20000);
});
