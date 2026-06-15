import { describe, it, expect } from "vitest";
import { createGroupSchema } from "./trip";

describe("createGroupSchema — groupType", () => {
  const base = { name: "My group", defaultCurrency: "INR" };

  it("accepts trip", () => {
    const r = createGroupSchema.safeParse({ ...base, groupType: "trip" });
    expect(r.success).toBe(true);
  });

  it("accepts nest", () => {
    const r = createGroupSchema.safeParse({ ...base, groupType: "nest" });
    expect(r.success).toBe(true);
  });

  // Regression: editing a Circle's name silently failed to save because the
  // schema rejected groupType "circle" — react-hook-form blocked submit on the
  // hidden groupType field with no visible error, so the Save button "did
  // nothing". The edit form reuses createGroupSchema for all group types.
  it("accepts circle", () => {
    const r = createGroupSchema.safeParse({ ...base, groupType: "circle" });
    expect(r.success).toBe(true);
  });

  it("defaults to trip when omitted", () => {
    const r = createGroupSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.groupType).toBe("trip");
  });

  it("rejects an unknown group type", () => {
    const r = createGroupSchema.safeParse({ ...base, groupType: "stream" });
    expect(r.success).toBe(false);
  });
});
