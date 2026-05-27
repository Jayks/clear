import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { eq, inArray } from "drizzle-orm";

const JAYAKUMAR_ID = "1e4c7866-a63d-4070-bb3b-790631efb844";
const NEW_IDS = [
  "e49a531e-233a-4a00-a0c5-14a5dab11f6e",
  "391073dc-3e4d-4975-9a5b-049b480bb3f5",
];

// 1. Do the groups exist?
const groupRows = await db.select({ id: groups.id, name: groups.name, currency: groups.defaultCurrency, isArchived: groups.isArchived, createdBy: groups.createdBy })
  .from(groups)
  .where(inArray(groups.id, NEW_IDS));
console.log(`\n── Groups in DB: ${groupRows.length} ──`);
for (const g of groupRows) {
  console.log(`  ${g.name}`);
  console.log(`  id=${g.id}  currency=${g.currency}  isArchived=${g.isArchived}`);
  console.log(`  createdBy=${g.createdBy}  ${g.createdBy === JAYAKUMAR_ID ? "✅ Jayakumar" : "❌ NOT Jayakumar"}`);
}

// 2. Is Jayakumar a member?
const memberRows = await db.select({ groupId: groupMembers.groupId, role: groupMembers.role, userId: groupMembers.userId })
  .from(groupMembers)
  .where(inArray(groupMembers.groupId, NEW_IDS));
console.log(`\n── Members in these groups ──`);
for (const m of memberRows) {
  const who = m.userId === JAYAKUMAR_ID ? "✅ Jayakumar" : m.userId ? m.userId : "guest";
  console.log(`  groupId=${m.groupId}  role=${m.role}  ${who}`);
}

// 3. All of Jayakumar's memberships
const allMine = await db.select({ groupId: groupMembers.groupId })
  .from(groupMembers)
  .where(eq(groupMembers.userId, JAYAKUMAR_ID));
console.log(`\n── Jayakumar total memberships: ${allMine.length} ──`);
for (const m of allMine) {
  const flag = NEW_IDS.includes(m.groupId) ? " ← US group" : "";
  console.log(`  ${m.groupId}${flag}`);
}

process.exit(0);
