import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { eq } from "drizzle-orm";

// Delete the incomplete first-run trip (3 expenses only, Vinodhini admin)
const deleted = await db
  .delete(groups)
  .where(eq(groups.id, "5bde0af2-74d0-4e5b-b7c4-0a98dd2b8e59"))
  .returning({ name: groups.name });

console.log(deleted.length ? `✅  Deleted: ${deleted[0].name}` : "⚠️  Not found (already gone)");
process.exit(0);
