Run the full git commit and push workflow for this project:

1. Run `git status` to see what has changed.
2. Run `git diff` (staged and unstaged) to read the actual changes.
3. Run `git log --oneline -5` to match the existing commit message style.
4. Stage all changes with `git add -A`.
5. Write a concise commit message (imperative mood, one sentence) that accurately summarises WHAT changed and WHY, based on the diff. Follow the commit style you observed in step 3.
6. Commit using a HEREDOC so special characters are safe.
7. Run `git push origin main`.
8. Confirm success by showing the final `git status`.

Do not skip steps. Do nopupupt amend existing commits. If there is nothing to commit, say so and stop.