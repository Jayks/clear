-- Round 16 fix #3: defense-in-depth against the template double-log race.
-- The row-lock fix in logFromTemplate/autoLogDueTemplates/batchLogTemplates
-- (app/actions/expenses.ts) closes the race going forward; this unique
-- partial index is a second layer that makes a duplicate impossible even if
-- some future code path re-introduces a SELECT-then-INSERT without the lock.
--
-- Pre-check for existing duplicates before applying (must return 0 rows):
--   select source_template_id, expense_date, count(*) from expenses
--     where source_template_id is not null and is_template = false
--     group by 1,2 having count(*) > 1;
--
-- If the pre-check finds existing duplicates, surface them to the user
-- before applying this index — do NOT auto-delete money rows.

create unique index if not exists uq_expenses_template_month
  on expenses (source_template_id, expense_date)
  where source_template_id is not null and is_template = false;
