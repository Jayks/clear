---
description: Trace the full data path for a given feature and list which files need to change
---

The user wants to add or modify a feature related to: $ARGUMENTS

Trace the complete data flow for this feature through the Clear codebase and produce a change map.

Follow this exact path:

1. **Zod schema** — check `lib/validations/expense.ts` and `lib/validations/trip.ts`. Does the feature require new fields? If so, identify which schema and what to add.

2. **Server action** — check `app/actions/` for the relevant action (expenses.ts, groups.ts, members.ts, settlements.ts). Does a new action need to be created, or does an existing one need new parameters?

3. **DB query** — check `lib/db/queries/` for the query that feeds the action. Does the feature require a new column, a new query, or a change to an existing one?

4. **DB schema** — check `lib/db/schema/` for the relevant table. Does a new column or table need to be added? If so, note that `pnpm db:push` will be needed after.

5. **Component** — check `components/expense/` or `app/(app)/groups/[id]/expenses/` for the form or display component that surfaces this feature to the user. What props or UI elements change?

6. **Group config** — check `lib/group-config.ts`. Does the feature apply to trips only, nests only, or both? Does GROUP_CONFIG need a new flag?

Report as a numbered change list:
- Each item: FILE PATH — what changes and why
- Flag any DB schema changes (they require `pnpm db:push` + Supabase SQL Editor for indexes/policies)
- Flag any new server actions (they must follow the `{ ok: true } | { ok: false, error }` return convention)
- Flag any revalidateTag requirements (any action mutating `groups` or `group_members` must call `revalidateTag(\`group-\${groupId}\`, "max")`)

Keep the list tight. Do not write any code yet.
