import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { groupMembers } from "../lib/db/schema/group-members";
import { eq, and, inArray } from "drizzle-orm";

const VINODHINI_ID = "4066d20b-ff14-400b-8ed7-6f8fd4c2dcee";
const JAYAKUMAR_ID = "1e4c7866-a63d-4070-bb3b-790631efb844";
const JAYAKUMAR_NAME = "Jayakumar Sekar";

const US_GROUP_IDS = [
  "2bd9cac9-3767-41cd-b33b-7f362c806301", // Pacific Coast Road Trip
  "c2e91184-1b86-4442-adbc-812e9ae15f97", // Maple Street Apartment
];

const updatedMembers = await db
  .update(groupMembers)
  .set({ userId: JAYAKUMAR_ID, displayName: JAYAKUMAR_NAME })
  .where(and(inArray(groupMembers.groupId, US_GROUP_IDS), eq(groupMembers.userId, VINODHINI_ID)))
  .returning({ groupId: groupMembers.groupId, role: groupMembers.role });

const updatedGroups = await db
  .update(groups)
  .set({ createdBy: JAYAKUMAR_ID })
  .where(inArray(groups.id, US_GROUP_IDS))
  .returning({ name: groups.name });

console.log(`✅  ${updatedMembers.length} member(s) swapped → Jayakumar`);
console.log(`✅  ${updatedGroups.length} group(s) createdBy → Jayakumar`);
for (const g of updatedGroups) console.log(`   ${g.name}`);
process.exit(0);
