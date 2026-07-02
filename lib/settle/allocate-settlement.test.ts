import { describe, it, expect } from "vitest";
import { allocateOldestFirstSettlement } from "./allocate-settlement";

describe("allocateOldestFirstSettlement", () => {
  it("returns empty for no records", () => {
    expect(allocateOldestFirstSettlement([], 100)).toEqual([]);
  });

  it("settles everything when paid amount covers the full outstanding total", () => {
    const records = [
      { id: "a", amount: 40 },
      { id: "b", amount: 60 },
    ];
    expect(allocateOldestFirstSettlement(records, 100)).toEqual(["a", "b"]);
  });

  it("settles everything when paid amount exceeds the total (overpay)", () => {
    const records = [{ id: "a", amount: 40 }];
    expect(allocateOldestFirstSettlement(records, 500)).toEqual(["a"]);
  });

  it("tolerates a 1-paisa rounding gap as a full match", () => {
    const records = [{ id: "a", amount: 40 }, { id: "b", amount: 60.005 }];
    // total = 100.005; paid 100 is within the 0.01 tolerance
    expect(allocateOldestFirstSettlement(records, 100)).toEqual(["a", "b"]);
  });

  it("settles only the oldest records that fully fit within the paid amount", () => {
    const records = [
      { id: "oldest", amount: 30 },
      { id: "middle", amount: 30 },
      { id: "newest", amount: 30 },
    ];
    // 65 covers oldest + middle (60) but not newest (would need 90)
    expect(allocateOldestFirstSettlement(records, 65)).toEqual(["oldest", "middle"]);
  });

  it("stops at the first record that doesn't fully fit — never partially settles a record", () => {
    const records = [
      { id: "a", amount: 50 },
      { id: "b", amount: 50 },
    ];
    // 60 covers "a" (50) but "b" (50) doesn't fit in the remaining 10
    expect(allocateOldestFirstSettlement(records, 60)).toEqual(["a"]);
  });

  it("settles nothing when the paid amount doesn't cover even the oldest record", () => {
    const records = [{ id: "a", amount: 100 }];
    expect(allocateOldestFirstSettlement(records, 10)).toEqual([]);
  });

  it("handles an exact match on a single record", () => {
    const records = [{ id: "a", amount: 100 }];
    expect(allocateOldestFirstSettlement(records, 100)).toEqual(["a"]);
  });
});
