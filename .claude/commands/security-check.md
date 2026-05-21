---
description: Audit all server actions and queries for Clear-specific security issues
---

Run a security audit of the Clear server-side code. Check for the following issues in this order:

**1. Missing auth guards in server actions**
Read every file in `app/actions/`. Each exported async function must call `getCurrentUser()` (from `lib/db/queries/auth.ts`) near the top before any DB access. Flag any function that accesses the DB without first calling `getCurrentUser()`.

**2. Missing membership checks**
After getting the user, actions that operate on a group must verify the user is a member of that group. Look for calls to `getMembership()` or equivalent. Flag any action that takes a `groupId` parameter but does not verify membership before proceeding.

**3. Missing revalidateTag after group/member mutations**
Any server action that writes to the `groups` or `group_members` tables must call `revalidateTag(\`group-\${groupId}\`, "max")`. Read `app/actions/groups.ts` and `app/actions/members.ts`. Flag any mutation (insert/update/delete) that does not call revalidateTag.

**4. Direct Supabase auth calls**
Search all files in `lib/db/queries/` and `app/actions/` for `supabase.auth.getUser()` called directly (not inside `lib/db/queries/auth.ts`). These bypass the React cache deduplication and are a performance + consistency risk. Flag each occurrence.

**5. Server actions returning thrown errors to client**
Server actions must return `{ ok: false, error: string }` — they must NOT throw. Search `app/actions/` for `throw new Error` or bare `throw` statements. Flag any that could propagate to the client.

**6. Hardcoded credentials or API keys**
Search all non-.env files for strings matching patterns: `sk-`, `sb_`, `eyJ`, `SUPABASE_SERVICE`, or any string that looks like an API key. Flag any found outside of `.env.local` or environment variable access.

Report findings grouped by category. For each finding: FILE:LINE — description of the issue. If a category is clean, say "✓ Clean".

Do not fix anything. This is a read-only audit.
