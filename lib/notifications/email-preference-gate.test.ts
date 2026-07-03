import { describe, it, expect } from "vitest";
import { isEmailEligible } from "./email-preference-gate";

describe("isEmailEligible", () => {
  it("sends when globally enabled and the group isn't muted", () => {
    expect(isEmailEligible({ globalEnabled: true, groupMuted: false })).toBe(true);
  });

  it("does not send when globally enabled but the group IS muted (per-group override wins)", () => {
    expect(isEmailEligible({ globalEnabled: true, groupMuted: true })).toBe(false);
  });

  it("does not send when globally disabled, even if the group isn't muted (opt-in gate blocks)", () => {
    expect(isEmailEligible({ globalEnabled: false, groupMuted: false })).toBe(false);
  });

  it("does not send when both are off", () => {
    expect(isEmailEligible({ globalEnabled: false, groupMuted: true })).toBe(false);
  });
});
