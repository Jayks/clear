import "dotenv/config";
import { createAdminClient } from "../lib/supabase/admin";
import { db } from "../lib/db/client";
import { groups } from "../lib/db/schema/groups";
import { streamRecords } from "../lib/db/schema/stream-records";
import { eq } from "drizzle-orm";

const admin = createAdminClient();

// List all users and find saijayakumar@gmail.com
const { data: listData, error } = await admin.auth.admin.listUsers({ perPage: 50 });
if (error) { console.error("Auth error:", error); process.exit(1); }

const me = listData?.users?.find((u: { email?: string }) => u.email === "saijayakumar@gmail.com");
const realUserId = me?.id;
console.log("Real user ID  :", realUserId ?? "NOT FOUND");
console.log("All user IDs  :", listData?.users?.map((u: { id: string; email?: string }) => `${u.id} (${u.email})`).join("\n                "));

const [firstGroup] = await db.select({ createdBy: groups.createdBy }).from(groups).limit(1);
const seedUsedId = firstGroup?.createdBy;
console.log("Seed used ID  :", seedUsedId);
console.log("Match         :", realUserId === seedUsedId);

// Count stream records seeded under each ID
const [seededCount] = await db
  .select()
  .from(streamRecords)
  .where(eq(streamRecords.creatorId, seedUsedId ?? ""));
console.log("Records seeded under seed ID (first result):", seededCount?.id ?? "none");

process.exit(0);
