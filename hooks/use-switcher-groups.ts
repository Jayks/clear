"use client";

import { useCallback, useState } from "react";
import { getSwitcherGroups, type SwitcherGroup } from "@/app/actions/groups";

/** Shared lazy-fetch for GroupSwitcherSheet (mobile) and GroupSwitcherDropdown
 *  (desktop) — both fetch the user's group list on first open via the same
 *  getSwitcherGroups() action, so this owns the one-shot fetch + null-loading
 *  state both callers otherwise duplicated. `ensureLoaded()` is idempotent —
 *  safe to call from a mount effect (sheet) or an onOpenChange callback
 *  (dropdown); it only fetches while `groups` is still null. */
export function useSwitcherGroups() {
  const [groups, setGroups] = useState<SwitcherGroup[] | null>(null);

  const ensureLoaded = useCallback(() => {
    if (groups === null) {
      getSwitcherGroups().then(setGroups).catch(() => setGroups([]));
    }
  }, [groups]);

  return { groups, ensureLoaded };
}
