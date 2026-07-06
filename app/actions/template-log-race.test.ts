// Integration test against the REAL dev database. Round 16 fix #3: the
// template double-log guard (SELECT-then-INSERT inside db.transaction()) was
// not actually atomic under READ COMMITTED — two concurrent calls could both
// see "not logged yet" before either commits. Verifies the row-lock fix
// (`.for("update")` on the template row) actually serializes concurrent
// calls to logFromTemplate/autoLogDueTemplates for the same template+month.
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

vi.mock("@/lib/subscription/gates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription/gates")>();
  return {
    ...actual,
    canUseTemplates: vi.fn(async () => true),
  };
});

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { expenses } = await import("@/lib/db/schema/expenses");
const { logFromTemplate, autoLogDueTemplates } = await import("@/app/actions/expenses");
const { eq, and } = await import("drizzle-orm");

async function makeTemplate(groupId: string) {
  const [template] = await db
    .insert(expenses)
    .values({
      groupId,
      paidByMemberId: (await db.select({ id: groupMembers.id }).from(groupMembers).where(eq(groupMembers.groupId, groupId)))[0].id,
      description: "Rent",
      category: "housing",
      amount: "1000.00",
      currency: "INR",
      expenseDate: "2026-01-01",
      isTemplate: true,
      recurrence: "monthly",
      createdByUserId: TEST_USER_ID,
    })
    .returning({ id: expenses.id });
  return template.id;
}

describe("Template double-log race (live-DB integration)", () => {
  let groupId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Template Race Test Nest (auto-cleaned)", groupType: "nest", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    await db.insert(groupMembers).values({ groupId, userId: TEST_USER_ID, displayName: "Race Tester", role: "admin" });
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("logFromTemplate: two concurrent calls for the same template log exactly once", async () => {
    const templateId = await makeTemplate(groupId);

    const [r1, r2] = await Promise.all([logFromTemplate(templateId), logFromTemplate(templateId)]);
    const results = [r1, r2];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    const failure = failed[0];
    if (!failure.ok) expect(failure.error).toMatch(/already been logged/i);

    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const loggedRows = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.sourceTemplateId, templateId),
          eq(expenses.expenseDate, firstOfMonth),
          eq(expenses.isTemplate, false),
        ),
      );
    expect(loggedRows.length).toBe(1); // the real invariant — never two rows in the DB
  }, 20000);

  it("autoLogDueTemplates: two concurrent calls for the same group log the template exactly once", async () => {
    const templateId = await makeTemplate(groupId);

    await Promise.all([autoLogDueTemplates(groupId), autoLogDueTemplates(groupId)]);

    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const loggedRows = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.sourceTemplateId, templateId),
          eq(expenses.expenseDate, firstOfMonth),
          eq(expenses.isTemplate, false),
        ),
      );
    expect(loggedRows.length).toBe(1);
  }, 20000);
});
