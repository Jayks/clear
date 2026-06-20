# DB Performance — Current State Audit

> Source of truth for query/indexing patterns in Clear. Written from a fresh, code-verified pass (not assumptions) — every claim below was confirmed by reading the actual query/schema/SQL files. Re-run this audit after major query-layer changes rather than trusting it indefinitely.

## 1. Indexing — already covered

`drizzle/indexes.sql` (manually applied via Supabase SQL Editor — **not** managed by drizzle-kit) already defines the composite/partial indexes that matter for the hot paths:

```sql
create index if not exists idx_group_members_group_user on group_members (group_id, user_id);
create index if not exists idx_expenses_group_template_date on expenses (group_id, is_template, expense_date desc);
create index if not exists idx_expenses_source_template on expenses (source_template_id) where source_template_id is not null;
create index if not exists idx_expense_splits_expense on expense_splits (expense_id);
create index if not exists idx_expense_splits_member on expense_splits (member_id);
create index if not exists idx_settlements_group on settlements (group_id);
create index if not exists idx_group_members_user on group_members (user_id);
-- plus expense_reactions / expense_comments / expense_disputes / expense_reads
```

Newer feature tables ship their **own** index files (per-feature, not centralized — this is the established convention, don't fight it):

| Table(s) | Index file |
|---|---|
| `circle_contributions` | `drizzle/circle-tables.sql` — `idx_circle_contributions_group_id`, `_member_id`, `_period` |
| `stream_records`, `stream_settlements`, `stream_guests` | `drizzle/stream-tables.sql` — `idx_stream_records_creator`, `_counterpart`, `_confirm_token`, `_status`; `idx_stream_settlements_stream_id`; `idx_stream_guests_created_by` |
| `payment_requests` | `drizzle/payment-requests.sql` — unique dedup index `payment_requests_one_live_per_payer` |
| `razorpay_payments` / `ai_usage` | `drizzle/razorpay-tables.sql` / `drizzle/ai-usage.sql` — unique indexes present |

**Convention going forward**: new tables get a dedicated `drizzle/<feature>-tables.sql` with their own indexes, applied manually to Supabase. Don't expect a single `indexes.sql` to be the only place to look.

## 2. Caching patterns already in place

- **React `cache()`** — request-scoped dedup, no extra network round trips within one render tree:
  - `getCurrentUser()`, `getMembership(groupId, userId)`, `getUserMemberIds(groupIds, userId)` — `lib/db/queries/auth.ts`
  - `getHomeBalances()` — `lib/db/queries/balances.ts`
- **`unstable_cache` + `revalidateTag`** — cross-request caching, invalidated on mutation:
  - `getGroupWithMembers(groupId)` — tagged `group-${groupId}`
  - `getBalances(groupId, currency)` — tagged `balances-${groupId}`
  - `getThisMonthSpent`, `getTopCategory`

These two mechanisms are complementary, not redundant: `cache()` avoids re-fetching the *same* data twice in one request; `unstable_cache` avoids re-computing it across *different* requests until something invalidates the tag. Don't replace one with the other.

## 3. Batched/aggregate query patterns already in place

- **`getMemberCounts()`** (`lib/db/queries/groups.ts:19-26`) — single `inArray` + `groupBy` query feeding a `Map`, used by `getAllGroups()`. No correlated subquery per row.
- **`getAllTripsInsightsData()` / `getAllNestsInsightsData()`** (`lib/db/queries/insights.ts`) — category totals computed via SQL `GROUP BY` (`sum`, `count`), not by fetching full expense rows into JS. `getAllNestsInsightsData` selects only `{groupId, amount, expenseDate, sourceTemplateId}`.
- **`getHomeBalances()`** (`lib/db/queries/balances.ts:156-265`) — computes the current user's net balance across **all** their groups in one `cache()`-wrapped call backed by 6 parallel aggregate queries (`_computeHomeBalances`, `Promise.all`). Replaced an earlier N-heavy CTE-per-card fan-out on the home page (see in-code comment at `balances.ts:139-148`). **This is the reference pattern** — any new home-page-style "per-card stat" feature should follow it rather than letting each card independently query.
- **`batchGetUserNames()`** (`lib/db/queries/stream.ts:136-159`) — `selectDistinctOn` batch name resolution. `buildPersonSummaries()` (used by both `getStreamSummary` and `getStreamDashboard`) and `getStreamDashboard()` (`stream.ts:342-501`) collect IDs from multiple independent sections (pending / closed / activity) up front and resolve names in a **single** batch query instead of three sequential round trips.
- **`Promise.all` parallelization** is the default for independent queries throughout the query layer — confirmed in `groups.ts`, `expenses.ts`, `balances.ts`, `insights.ts`, `circle.ts` (`getCircleCardData`, `getCircleDashboardData`), and the `settle`/`expenses` page loaders. `app/(app)/groups/[id]/expenses/page.tsx` even folds `getCurrentUser()` into the same batch as the rest of the page's data fetches since it's `cache()`-deduped and free to call again.

## 4. Genuinely remaining opportunities (found in this pass)

These are minor — not correctness bugs, not regressions — but worth picking up opportunistically:

1. **`searchStreamableUsers(userId, query)`** — `lib/db/queries/stream.ts:804-860`. Runs two independent queries sequentially:
   ```typescript
   const groupUserRows = await db.selectDistinctOn(...)...;
   const guestRows = await db.select().from(streamGuests)...;
   ```
   Neither depends on the other's result — wrap both in `Promise.all`.

2. **Circle home-page cards have no `getHomeBalances`-equivalent batching.** Each `CircleCardServer` instance independently calls `getCircleCardData()` (its own 4-query `Promise.all`) per circle. At typical circle counts (a handful per user) this is negligible, but unlike Trips/Nests it hasn't received the "batch across all cards into one call" treatment. Worth doing if/when circle counts per user grow, following the `getHomeBalances` pattern as the template.

No other N+1, missing-index, or unbatched-aggregate issues were found across `groups.ts`, `expenses.ts`, `balances.ts`, `insights.ts`, `circle.ts`, `settlements.ts`, or `stream.ts` in this pass.
