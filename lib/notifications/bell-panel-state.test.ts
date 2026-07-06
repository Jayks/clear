// Round 16 fixes #5/#16: pure classifier for the bell panel's 4-way render
// branch (loading/failed/empty/list) — extracted from duplicated inline JSX
// ternaries in both notification-bell-desktop.tsx and
// notification-bell-mobile.tsx so the branching logic is unit-testable
// without rendering a component (the failed-fetch RTL path is flaky due to
// an unrelated React act()/framer-motion timing interaction — see the
// comment in notification-bell-mobile.test.tsx).
import { describe, it, expect } from "vitest";
import { resolveBellPanelState } from "./bell-panel-state";
import type { Notification } from "@/lib/db/schema/notifications";

function makeRow(id: string): Notification {
  return { id } as unknown as Notification;
}

describe("resolveBellPanelState", () => {
  it("returns 'loading' when notifications is null and no load has failed", () => {
    expect(resolveBellPanelState(null, false)).toBe("loading");
  });

  it("returns 'failed' when notifications is null and loadFailed is true", () => {
    expect(resolveBellPanelState(null, true)).toBe("failed");
  });

  it("returns 'empty' when notifications is an empty array", () => {
    expect(resolveBellPanelState([], false)).toBe("empty");
    // loadFailed is irrelevant once we actually have a (empty) result — a
    // failure from a PRIOR open shouldn't haunt a since-succeeded refresh.
    expect(resolveBellPanelState([], true)).toBe("empty");
  });

  it("returns 'list' when notifications has rows", () => {
    expect(resolveBellPanelState([makeRow("1")], false)).toBe("list");
  });

  it("prioritizes the cached list over loadFailed (fix #5's 'keep cached list while refresh is in flight' behaviour)", () => {
    // A previously-successful fetch, then a subsequent refresh fails — the
    // cached list should still win over showing a failure message.
    expect(resolveBellPanelState([makeRow("1")], true)).toBe("list");
  });
});
