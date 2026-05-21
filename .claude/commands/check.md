---
description: Run typecheck + tests and summarise any failures in plain English
---

Run the project quality checks in this order:

1. Run `pnpm typecheck` and capture the output.
2. Run `pnpm test --run` and capture the output.
3. Report results as a short summary:
   - If both pass: say "✓ Typecheck passed. ✓ All tests passed." and stop.
   - If typecheck fails: list each error as "FILE:LINE — error message", grouped by file. Cap at 10 errors; if more exist, say how many remain.
   - If tests fail: list each failing test name and the failure reason in one sentence each.
   - If both fail: show typecheck errors first, then test failures.
4. Do not attempt to fix anything unless the user explicitly asks.
