---
description: Summarise the current DB schema and flag any drift between schema files and drizzle config
---

Audit the Clear database schema and report its current state:

1. Read all files in `lib/db/schema/` and list every table with its columns (name + type only, no full definitions).
2. Read `drizzle/indexes.sql` and list the indexes that exist (note: these are applied manually in Supabase, not via drizzle-kit).
3. Read `drizzle/policies.sql` and confirm RLS is defined for all 5 tables: groups, group_members, expenses, expense_splits, settlements.
4. Check `drizzle.config.ts` to confirm the out directory and dialect.
5. Look for any generated files in the `drizzle/` folder (*.sql migration files). If none exist beyond indexes.sql and policies.sql, note that `db:push` is being used (schema-push mode, not migrations).
6. Report as a structured summary:
   - Tables (count + names)
   - Indexes (count + which tables they cover)
   - RLS status (covered / missing per table)
   - Migration mode (push vs migrate)
   - Any obvious drift: a column in schema/ not reflected in indexes, or a table missing from policies.sql

Do not modify any files. This is a read-only audit.
