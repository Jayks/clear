import { createAdminClient } from "../lib/supabase/admin";

const admin = createAdminClient();
const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
if (error) { console.error(error); process.exit(1); }

const known = [
  "4066d20b-ff14-400b-8ed7-6f8fd4c2dcee", // Vinodhini
];

console.log("\nAll auth users:");
for (const u of data.users) {
  const flag = known.includes(u.id) ? " ← Vinodhini" : "";
  console.log(`  ${u.id}  ${u.email}  (${u.user_metadata?.full_name ?? "no name"})${flag}`);
}
process.exit(0);
