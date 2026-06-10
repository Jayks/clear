/**
 * Read-only smoke test for the drizzle-orm 0.45.2 bump.
 *
 * typecheck + build prove compile-time compatibility, but 0.45's security fix
 * changed how SQL identifiers are escaped at runtime. This exercises the actual
 * query SHAPES the app depends on (getTableColumns select, $with CTE +
 * coalesce sql template, inArray join, raw sql execute, transaction) against the
 * live DB to confirm they still generate valid, executable SQL.
 *
 * SELECT-only — safe to run against any environment. Run: pnpm tsx scripts/drizzle-smoke.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db/client");
  const { groups } = await import("../lib/db/schema/groups");
  const { groupMembers } = await import("../lib/db/schema/group-members");
  const { expenses } = await import("../lib/db/schema/expenses");
  const { expenseSplits } = await import("../lib/db/schema/expense-splits");
  const { eq, and, sum, sql, inArray, getTableColumns } = await import("drizzle-orm");

  // 1 — getTableColumns select (mirrors getGroupWithMembers / getAllGroups select-all,
  //     and confirms the new summary_token column resolves)
  const cols = getTableColumns(groups);
  const rows = await db.select(cols).from(groups).limit(1);
  console.log(`✓ getTableColumns select-all (${Object.keys(cols).length} cols) → ${rows.length} row(s)`);
  if (rows[0]) console.log(`  summary_token present: ${"summaryToken" in rows[0]}`);

  const gid = rows[0]?.id;
  if (!gid) {
    console.log("\nNo groups in DB — basic select OK; skipping group-scoped shapes.");
    process.exit(0);
  }

  // 2 — $with CTE + sum + coalesce sql template (the getBalances pattern — the one
  //     most likely to be affected by an identifier-escaping change)
  const paidCte = db.$with("paid").as(
    db
      .select({ memberId: expenses.paidByMemberId, paidTotal: sum(expenses.amount).as("paid_total") })
      .from(expenses)
      .where(and(eq(expenses.groupId, gid), eq(expenses.isTemplate, false)))
      .groupBy(expenses.paidByMemberId),
  );
  const cteRows = await db
    .with(paidCte)
    .select({ memberId: groupMembers.id, paid: sql<string>`coalesce(${paidCte.paidTotal}, '0')` })
    .from(groupMembers)
    .leftJoin(paidCte, eq(groupMembers.id, paidCte.memberId))
    .where(eq(groupMembers.groupId, gid));
  console.log(`✓ $with CTE + coalesce sql template → ${cteRows.length} balance row(s)`);

  // 3 — inArray join (getGroupExpensesWithSplits pattern)
  const exp = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.groupId, gid)).limit(5);
  const ids = exp.map((e) => e.id);
  const splits = ids.length
    ? await db.select().from(expenseSplits).where(inArray(expenseSplits.expenseId, ids))
    : [];
  console.log(`✓ inArray join → ${splits.length} split(s) across ${ids.length} expense(s)`);

  // 4 — raw sql execute (activity-feed pattern)
  const raw = await db.execute(sql`select count(*)::int as n from groups`);
  console.log(`✓ raw sql execute → ${JSON.stringify(Array.from(raw as Iterable<unknown>)[0])}`);

  // 5 — transaction (addExpense / createGroup pattern)
  await db.transaction(async (tx) => {
    await tx.select({ id: groups.id }).from(groups).limit(1);
  });
  console.log("✓ transaction block");

  console.log("\n✅ All drizzle 0.45.2 query patterns executed successfully against the live DB.");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✗ SMOKE FAILED:", e);
  process.exit(1);
});
