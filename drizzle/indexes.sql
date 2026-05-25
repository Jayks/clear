-- ============================================================
-- Clear — Database Indexes
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- These are not managed by drizzle-kit; run manually alongside policies.sql
-- ============================================================

-- For RLS subqueries on every protected query:
-- exists(select 1 from group_members where group_id=? and user_id=?)
create index if not exists idx_group_members_group_user
  on group_members (group_id, user_id);

-- For getExpenses, getMonthlyExpenseSummary, getGroupExpensesWithSplits
-- Covers: WHERE group_id=? AND is_template=? ORDER BY expense_date DESC
create index if not exists idx_expenses_group_template_date
  on expenses (group_id, is_template, expense_date desc);

-- For getGroupTemplates "loggedThisMonth" lookup
-- Partial index — only rows where source_template_id is set
create index if not exists idx_expenses_source_template
  on expenses (source_template_id) where source_template_id is not null;

-- For getGroupExpensesWithSplits and balance split aggregate
-- Covers: WHERE expense_id = ANY(?)
create index if not exists idx_expense_splits_expense
  on expense_splits (expense_id);

-- For per-member balance aggregation
-- Covers: GROUP BY member_id in balances query
create index if not exists idx_expense_splits_member
  on expense_splits (member_id);

-- For getBalances and getSettlements
-- Covers: WHERE group_id=? in settlements
create index if not exists idx_settlements_group
  on settlements (group_id);

-- For getAllTripsInsightsData, getAllNestsInsightsData — WHERE user_id=? membership scan
-- The composite (group_id, user_id) index is not used when filtering by user_id alone
create index if not exists idx_group_members_user
  on group_members (user_id);

-- ── Reactions, Comments, Disputes ─────────────────────────────────────────────

-- Batch count fetch: WHERE expense_id = ANY(?) for reactions
create index if not exists idx_reactions_expense
  on expense_reactions (expense_id);

-- RLS subquery: WHERE group_id = ? for reactions
create index if not exists idx_reactions_group
  on expense_reactions (group_id);

-- Thread page + count fetch: WHERE expense_id = ANY(?) for comments
create index if not exists idx_comments_expense
  on expense_comments (expense_id);

-- RLS subquery for comments
create index if not exists idx_comments_group
  on expense_comments (group_id);

-- Dispute lookup by expense (detail sheet + card signal)
create index if not exists idx_disputes_expense
  on expense_disputes (expense_id);

-- Activity feed + card signal: pending disputes per group
create index if not exists idx_disputes_group_status
  on expense_disputes (group_id, status);
