import { describe, it, expect } from "vitest";
import { shouldShowAiNudge, AI_NUDGE_SCAN_THRESHOLD } from "./ai-nudge";

describe("shouldShowAiNudge", () => {
  it("never fires for a Plus user, regardless of scan count", () => {
    expect(shouldShowAiNudge(0, "plus")).toBe(false);
    expect(shouldShowAiNudge(AI_NUDGE_SCAN_THRESHOLD, "plus")).toBe(false);
    expect(shouldShowAiNudge(1000, "plus")).toBe(false);
  });

  it("does not fire below the threshold on Free", () => {
    expect(shouldShowAiNudge(0, "free")).toBe(false);
    expect(shouldShowAiNudge(AI_NUDGE_SCAN_THRESHOLD - 1, "free")).toBe(false);
  });

  it("fires exactly at the threshold on Free", () => {
    expect(shouldShowAiNudge(AI_NUDGE_SCAN_THRESHOLD, "free")).toBe(true);
  });

  it("keeps firing above the threshold on Free", () => {
    expect(shouldShowAiNudge(AI_NUDGE_SCAN_THRESHOLD + 1, "free")).toBe(true);
    expect(shouldShowAiNudge(1000, "free")).toBe(true);
  });
});
