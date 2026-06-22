// One-off: list every Supabase Auth user who has signed in at least once
// (last_sign_in_at IS NOT NULL). Run: tsx --env-file=.env.local scripts/list-signed-in-users.ts
import { createAdminClient } from "../lib/supabase/admin";

const admin = createAdminClient();

type AuthUser = {
  id: string;
  email?: string | null;
  last_sign_in_at?: string | null;
  created_at: string;
  user_metadata?: Record<string, unknown> | null;
};

const all: AuthUser[] = [];
let page = 1;
const perPage = 1000;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) { console.error(error); process.exit(1); }
  all.push(...(data.users as AuthUser[]));
  if (data.users.length < perPage) break;
  page++;
}

const signedIn = all
  .filter((u) => u.last_sign_in_at)
  .sort((a, b) => new Date(a.last_sign_in_at!).getTime() - new Date(b.last_sign_in_at!).getTime());

console.log(`Total auth users: ${all.length}`);
console.log(`Signed in at least once: ${signedIn.length}`);
console.log(`Never signed in: ${all.length - signedIn.length}\n`);

console.log("email\tfull_name\tcreated_at\tlast_sign_in_at\tuser_id");
for (const u of signedIn) {
  const name = (u.user_metadata?.full_name as string | undefined) ?? "";
  console.log(`${u.email ?? ""}\t${name}\t${u.created_at}\t${u.last_sign_in_at}\t${u.id}`);
}

process.exit(0);
