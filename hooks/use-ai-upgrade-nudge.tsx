"use client";

import { useState } from "react";
import { getAiNudgeStatus } from "@/app/actions/subscription";
import { UpgradeSheet } from "@/components/subscription/upgrade-sheet";

// One nudge per browser TAB, across every reason — not just AI (RAZORPAY_PLAN.md
// §10 point 4). sessionStorage is scoped per browsing-context, not per "session"
// in the human sense — a user with two tabs open on the same group can still see
// it twice (once per tab). Accepted: a stronger global guard (localStorage) would
// make it once-EVER instead of once-per-visit, which is too suppressive for a
// nudge meant to recur across different trips.
const SESSION_KEY = "clear_upgrade_nudge_shown";

interface NudgeState {
  groupName: string;
  count: number;
  onDone: () => void;
}

function alreadyShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false; // privacy mode / storage disabled — fail open, never block the save flow
  }
}

function markShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // best-effort
  }
}

/**
 * Celebratory AI-scan upgrade nudge (RAZORPAY_PLAN.md §10 / M4). Call
 * `maybeNudge` right after a successful expense save instead of running the
 * caller's normal post-save step (toast/redirect/auto-close) directly — pass
 * that step as `onDone`. If the nudge isn't eligible, `onDone` runs
 * immediately and nothing visible changes. If it is, `UpgradeSheet` opens;
 * dismissing it still runs `onDone` (so the user lands where they expected),
 * while tapping its CTA navigates to checkout instead.
 *
 * Render the returned `nudgeSheet` once, anywhere in the caller's JSX tree.
 */
export function useAiUpgradeNudge() {
  const [nudge, setNudge] = useState<NudgeState | null>(null);

  async function maybeNudge(
    opts: { groupId: string; groupName: string; wasAiScanned: boolean },
    onDone: () => void
  ) {
    if (!opts.wasAiScanned || alreadyShownThisSession()) {
      onDone();
      return;
    }

    let status: { show: boolean; count: number };
    try {
      status = await getAiNudgeStatus(opts.groupId);
    } catch {
      onDone();
      return;
    }

    if (!status.show) {
      onDone();
      return;
    }

    markShown();
    setNudge({ groupName: opts.groupName, count: status.count, onDone });
  }

  const nudgeSheet = (
    <UpgradeSheet
      open={nudge !== null}
      reason="ai"
      context={nudge ? { groupName: nudge.groupName, count: nudge.count } : undefined}
      onDismiss={() => {
        const onDone = nudge?.onDone;
        setNudge(null);
        onDone?.();
      }}
      onUpgrade={() => setNudge(null)}
    />
  );

  return { maybeNudge, nudgeSheet };
}
