# Clear — DB & Data Layer Reference

> Loaded when editing `lib/db/**`, `lib/splits/`, `lib/settle/`, `lib/group-config.ts`, `lib/categories.ts`, `drizzle/**`.

---

## Database Schema

Schema files in `lib/db/schema/`. RLS in `drizzle/policies.sql`.

### groups
```
id, name, description, cover_photo_url
group_type: enum('trip', 'nest') default 'trip'
default_currency: text default 'INR'
start_date, end_date: date          -- trips only
budget: numeric(12,2)               -- optional
itinerary: text                     -- trips only; max 10,000 chars (Zod-only, DB is unlimited)
is_archived: boolean default false
is_demo: boolean default false      -- seeded sample group; pinned first
created_by: uuid
share_token: uuid unique default gen_random_uuid()
created_at: timestamptz
```

### group_members
```
id, group_id fk->groups(cascade)
user_id: uuid nullable
guest_name: text nullable
display_name: text nullable
role: enum('admin','member') default 'member'
joined_at: timestamptz default now()
notifications_muted: boolean default false   -- per-group email + push opt-out
CHECK: exactly one of (user_id, guest_name)
UNIQUE: (group_id, user_id)
```

### expenses
```
id, group_id fk->groups(cascade), paid_by_member_id fk->group_members
description: text, category: text   -- text, not enum (validated by Zod + GROUP_CONFIG)
custom_category: text nullable      -- free-text label when category = 'other'
amount: numeric(12,2), currency: text, expense_date: date, end_date: date, notes: text
is_template: boolean default false  -- recurring template (nest)
recurrence: text                    -- 'monthly' | 'weekly' (templates only)
source_template_id: uuid nullable
created_by_user_id: uuid
updated_by_user_id: uuid nullable   -- set by updateExpense(); null on create
created_at: timestamptz, updated_at: timestamptz
```

### expense_splits
```
id
group_id: uuid nullable fk->groups(cascade)   -- added for realtime filtering; always populated on new inserts
expense_id fk->expenses(cascade), member_id fk->group_members(cascade)
share_amount: numeric(12,2)
split_type: enum('equal','exact','percentage','shares')
split_value: numeric(12,4)
UNIQUE: (expense_id, member_id)
```

### settlements
```
id, group_id, from_member_id, to_member_id fk->group_members
amount: numeric(12,2), currency, note, settled_at
CHECK: from_member_id <> to_member_id
```

### expense_reactions
```
id
expense_id: uuid fk->expenses(cascade)
group_id: uuid fk->groups(cascade)
member_id: uuid fk->group_members(cascade)
emoji: text   -- 'thumbs_up' | 'seen'
created_at: timestamptz
UNIQUE: (expense_id, member_id, emoji)
```
Schema: `lib/db/schema/expense-reactions.ts`. RLS: group members read/write own group.

### expense_comments
```
id
expense_id: uuid fk->expenses(cascade)
group_id: uuid fk->groups(cascade)
member_id: uuid fk->group_members(cascade)
content: text NOT NULL
mentioned_member_ids: uuid[] default '{}'
created_at: timestamptz
```
Schema: `lib/db/schema/expense-comments.ts`. RLS: group members read; own or admin delete.

### expense_disputes
```
id
expense_id: uuid fk->expenses(cascade)
group_id: uuid fk->groups(cascade)
requested_by_member_id: uuid fk->group_members(cascade)
type: text   -- 'question' | 'remove_me' | 'change_share' | 'split_equal' | 'other'
status: text default 'pending'   -- 'pending' | 'accepted' | 'declined' | 'cancelled'
requested_amount: numeric(12,2) nullable   -- for 'change_share' type
message: text nullable
resolved_at: timestamptz nullable
resolved_by_member_id: uuid nullable
created_at: timestamptz
```
Schema: `lib/db/schema/expense-disputes.ts`. RLS: group members read; payer/admin resolve.

**Auto-resolve**: `accepted` disputes of type `remove_me`, `change_share`, `split_equal` trigger pure-function transforms in `lib/interactions/split-transforms.ts` (20 Vitest tests) then call `updateExpense` + `revalidateTag` inside `acceptDispute` action.

### expense_reads
```
id
expense_id: uuid fk->expenses(cascade)
group_id: uuid fk->groups(cascade)
member_id: uuid fk->group_members(cascade)
last_read_at: timestamptz NOT NULL default now()
UNIQUE: (expense_id, member_id)
```
Schema: `lib/db/schema/expense-reads.ts`. RLS: group members full access to their own group's rows.
Updated by `markSeenAction` on every detail-sheet open (`onConflictDoUpdate` → `last_read_at = now()`). Used by `getExpenseInteractionCounts` to compute `hasUnread`.

### push_subscriptions
```
id
user_id: uuid fk->auth.users(cascade)
endpoint: text NOT NULL
p256dh: text NOT NULL
auth: text NOT NULL
created_at: timestamptz
UNIQUE: (user_id, endpoint)
```
RLS: users read/write only their own rows. Schema: `lib/db/schema/push-subscriptions.ts`.

### subscriptions
```
id
user_id: uuid NOT NULL UNIQUE
plan: text default 'free'           -- 'free' | 'plus'
status: text default 'trialing'     -- 'trialing' | 'active' | 'cancelled'
trial_ends_at: timestamptz
current_period_end: timestamptz
billing_cycle: text nullable        -- 'monthly' | 'annual'
admin_override: boolean default false
razorpay_subscription_id: text nullable
created_at, updated_at: timestamptz
```
Schema: `lib/db/schema/subscriptions.ts`. **Note:** `pnpm db:push` has a pre-existing drizzle-kit bug with `group_members` CHECK constraint — apply new columns via direct SQL in Supabase SQL Editor.

### Supabase Storage — `cover-photos` bucket (run once)

Dashboard → Storage → New bucket: name `cover-photos`, Public, 5 MB limit. Three RLS policies: authenticated insert (folder = `auth.uid()`), public select, authenticated delete own. Files at `{userId}/{timestamp}-{slug}.{ext}`. `next.config.ts` has Supabase project hostname in `remotePatterns`.

### Realtime setup — add `expenses`, `expense_splits`, `settlements`, `group_members` to `supabase_realtime` publication (SQL Editor, run once).

---

## Query Patterns & Caching

### `getGroupWithMembers` — cached fetch, itinerary excluded by default

`opts: { full?: boolean }` (default `false`). When false, `itinerary` is `null`. Pass `{ full: true }` only on insights and edit pages. Cached via `unstable_cache` tagged `group-${groupId}` — invalidated by `revalidateTag` only.

### Group cache invalidation — `revalidateTag` required on mutations

Always two args: `revalidateTag(\`group-${groupId}\`, "max")` — single-arg form is a TS error in Next.js 16. Call on: `updateGroup`, `archiveGroup`, `regenerateShareToken`, `addGuestMember`, `removeMember`, `joinGroup`, `claimGuestMember`.

**`getAllGroups()`** — one query returning `{ active, archived }`. Replaces `getGroups()` + `getArchivedGroups()`.

### `getBalances()` — cached, currency-filtered CTE

`getBalances(groupId, defaultCurrency)` — filters to `defaultCurrency` expenses only. Returns `{ balances, suggestions, hasMixedCurrencies }`. Wrapped in `unstable_cache` tagged `balances-${groupId}`. Must call `revalidateTag('balances-${groupId}', 'max')` on every action touching expenses or settlements: `addExpense`, `updateExpense`, `duplicateExpense`, `deleteExpense`, `logFromTemplate`, `autoLogDueTemplates`, `recordSettlement`, `deleteSettlement`.

**CTE alias pitfall**: 4 CTE aliases must be unique (`paid_total`, `owed_total`, `sent_total`, `received_total`) — Postgres raises "column reference is ambiguous" if all named `total`.

### Interaction queries — `lib/db/queries/interactions.ts`

Two exported functions:
- `getExpenseInteractionCounts(expenseIds[], currentMemberId)` — batch, **no cache** (called at RSC render time per page). Returns `Record<expenseId, ExpenseInteractionCount>`. Runs 4 queries in parallel: reactions, comments (+ `createdAt`), disputes, expense_reads. Fields: `commentCount`, `reactions` (per emoji), `myReaction`, `pendingDispute`, `hasUnread`, `seenMemberIds`.
- `getExpenseInteractions(expenseId, groupId)` — per-expense detail: full reactions, comments (with member info), disputes. Cached `interactions-${groupId}`; invalidated by every action in `app/actions/interactions.ts`.

**`hasUnread`** — true when latest comment `created_at > expense_reads.last_read_at` for the current member (or no reads row exists). Used to style the 💬 pill on `ExpenseCard` (cyan/normal = unread, slate/bold = read).

**`seenMemberIds`** — array of member IDs with a `seen` reaction. Passed to `SeenAvatarStack` in the detail sheet.

**Cache tag**: `interactions-${groupId}` — call `revalidateTag(\`interactions-${groupId}\`, 'max')` after any reaction, comment, or dispute mutation. Also invalidated by `markSeenAction`.

**`ExpenseInteractionCount` type** — use `import type` in client components to avoid bundling server-only DB modules.

### Activity feed queries — `lib/db/queries/activity.ts`

`getGroupActivity(groupId, limit: 3|5)` — union SQL across expenses, settlements, group_members. Cached with tags `['group-${groupId}', 'balances-${groupId}']` — invalidated by both group and balance mutations automatically.

### Overview page badge queries — `lib/db/queries/expenses.ts`

- `getTopCategory(groupId)` — top spending category by SUM(amount). Cached `balances-${groupId}`.
- `getThisMonthSpent(groupId)` — sum for current calendar month (nests). Cache key includes year+month so new month = fresh fetch automatically. Cached `balances-${groupId}`.

### Join page — existing member redirect + guest claim flow

`app/join/[token]/page.tsx`: (1) existing member → `getMembership()` → immediate `redirect(/groups/${group.id})`; (2) `getGroupByToken()` returns `unclaimedGuests` (null `user_id`) → cyan pill list → `claimGuestMember(token, guestMemberId)` atomically sets `user_id`, clears `guest_name`, sets `displayName` from Google.

`claimGuestMember` in `app/actions/members.ts`. Call `revalidateTag(\`group-${group.id}\`, 'max')` after claim.

### Misc constraints

- `computeTripInsights`: always `{ trip: group, ... }` — do not rename `trip`.
- `/summary/[token]` returns 404 for nests.
- **Date-range props**: components use `groupStartDate`/`groupEndDate`; AI `DateContext` uses `groupStart`/`groupEnd`.

---

## Group Config System

`lib/group-config.ts` — single source of truth for type differences:

```typescript
GROUP_CONFIG = {
  trip: { labels, showDates, showItinerary, showNarrative, showAdherence, showRecurring, showBudget, categories: TRIP_CATEGORIES },
  nest: { labels, showDates:false, showItinerary:false, showNarrative:false, showRecurring:true, showBudget:false, categories: NEST_CATEGORIES },
}
```

**Trip categories**: food, accommodation, transport, sightseeing, shopping, activities, groceries, tour_package, other
**Nest categories**: rent, utilities, groceries, subscriptions, food, healthcare, maintenance, supplies, other

Use `getGroupConfig(group.groupType)` — never `group.groupType === 'trip'` inline checks.

---

## Key Algorithms

### Balance formula
```
net = totalPaid - totalOwed + settlementsSent - settlementsReceived
```
Templates (`is_template = true`) excluded from all balance calculations.

### Recurring expenses (nest only)
- Templates: `is_template=true`, `recurrence='monthly'|'weekly'`
- Logged instances: `is_template=false`, `source_template_id=<id>`, `expense_date=first of current month`
- `getGroupTemplates()` returns each template with `loggedThisMonth` + `lastLoggedDate`
- Double-logging prevented: button disabled once logged this month
- **Auto-log on page load**: `autoLogDueTemplates(groupId)` in `app/actions/expenses.ts` called on nest overview page — best-effort (`.catch(() => {})`). Nests only.

### Split computation (`lib/splits/compute.ts`)
Four modes → `SplitResult[]` with `shareAmount` + `splitValue`:
- `equal`: divide evenly; `exact`: sum must equal total; `percentage`: sum must equal 100; `shares`: total > 0

Rounding: `Math.round(n * 100) / 100`. Remainder to first row. **16 Vitest tests — all must pass.**

### Settlement optimizer (`lib/settle/optimize.ts`)
Greedy: creditors/debtors by net, sort desc, match top pairs, emit min transactions. **6 Vitest tests.**
