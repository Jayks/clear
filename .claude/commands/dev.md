---
description: Manage the dev server — start, stop, or restart
---

Manage the Clear dev server based on this instruction: $ARGUMENTS

Follow the exact rule for the instruction given:

- **start** — run `pnpm dev` in the background. Confirm it started by waiting 3 seconds, then check if port 3000 is responding.
- **stop** — run `pnpm dev:kill` to stop any running dev server process.
- **restart** — run `pnpm dev:kill`, wait 2 seconds, then run `pnpm dev` in the background.
- **status** — check if something is listening on port 3000 and report "running" or "stopped".
- If no argument is given, default to **start**.

After the action, report what you did in one line.
