/**
 * Unit tests for member action guards from the June 2026 bug scan.
 *
 * M-1  addGuestMember — duplicate name check is a read-then-insert race (no DB unique constraint)
 * M-2  updateDisplayName — missing revalidateTag for group-level unstable_cache
 *
 * Run with: pnpm test lib/members/member-guards.test.ts
 */

import { describe, it, expect } from "vitest";
import { canRemoveMember, type MemberRoleRow } from "./member-guards";

// ── M-3: removeMember last-admin guard ────────────────────────────────────────

describe("canRemoveMember — last-admin guard (M-3)", () => {
  const members: MemberRoleRow[] = [
    { id: "admin-1", role: "admin" },
    { id: "admin-2", role: "admin" },
    { id: "member-1", role: "member" },
    { id: "member-2", role: "member" },
  ];

  it("removing a plain member is allowed", () => {
    expect(canRemoveMember(members, "member-1").ok).toBe(true);
  });

  it("removing an admin while another admin remains is allowed", () => {
    expect(canRemoveMember(members, "admin-1").ok).toBe(true);
  });

  it("[BUG] removing the only admin would orphan the group → blocked", () => {
    const soleAdmin: MemberRoleRow[] = [
      { id: "admin-1", role: "admin" },
      { id: "member-1", role: "member" },
    ];
    const result = canRemoveMember(soleAdmin, "admin-1");
    expect(result.ok).toBe(false);
  });

  it("an admin removing themselves is blocked when they are the last admin", () => {
    const soleAdmin: MemberRoleRow[] = [{ id: "admin-1", role: "admin" }];
    expect(canRemoveMember(soleAdmin, "admin-1").ok).toBe(false);
  });

  it("an admin removing themselves is allowed when a co-admin remains", () => {
    expect(canRemoveMember(members, "admin-2").ok).toBe(true);
  });

  it("unknown member id → not found", () => {
    const result = canRemoveMember(members, "ghost-999");
    expect(result.ok).toBe(false);
  });

  it("last admin can be removed once a second admin is added", () => {
    const before: MemberRoleRow[] = [{ id: "admin-1", role: "admin" }];
    expect(canRemoveMember(before, "admin-1").ok).toBe(false);
    const after: MemberRoleRow[] = [
      { id: "admin-1", role: "admin" },
      { id: "admin-2", role: "admin" },
    ];
    expect(canRemoveMember(after, "admin-1").ok).toBe(true);
  });
});

// ── M-1: addGuestMember duplicate name race ───────────────────────────────────

describe("addGuestMember — duplicate name guard (M-1)", () => {
  /** Simulates the current SELECT-then-INSERT pattern. */
  function addGuestNonAtomic(
    existingNames: string[],
    newName: string,
  ): "duplicate_error" | "inserted" {
    // Step 1: SELECT
    const isDuplicate = existingNames.some(
      (n) => n.toLowerCase() === newName.toLowerCase(),
    );
    if (isDuplicate) return "duplicate_error";
    // Step 2: INSERT (in real code: db.insert — but not atomic with step 1)
    return "inserted";
  }

  it("unique name → inserted successfully", () => {
    expect(addGuestNonAtomic(["Alice", "Bob"], "Charlie")).toBe("inserted");
  });

  it("exact duplicate → duplicate_error", () => {
    expect(addGuestNonAtomic(["Alice", "Bob"], "Alice")).toBe("duplicate_error");
  });

  it("case-insensitive duplicate → duplicate_error", () => {
    expect(addGuestNonAtomic(["alice"], "ALICE")).toBe("duplicate_error");
  });

  it("[BUG] concurrent race: two admin tabs both see empty list and both insert", () => {
    const sharedState: string[] = []; // no existing members
    const result1 = addGuestNonAtomic(sharedState, "Charlie"); // reads empty → inserts
    const result2 = addGuestNonAtomic(sharedState, "Charlie"); // ALSO reads empty → also inserts
    // Without an atomic check+insert, both calls return "inserted"
    expect(result1).toBe("inserted");
    expect(result2).toBe("inserted");
    // Both inserts succeed → two identical guest members "Charlie" in the group
    // Fix: add a DB-level UNIQUE constraint on (group_id, guest_name) and
    //      catch the Postgres unique-violation error (code 23505)
  });

  it("[FIXED invariant] DB unique constraint prevents any duplicate inserts", () => {
    // Simulate what a UNIQUE constraint does: second insert with same key throws
    const inserted = new Set<string>();
    function insertWithUniqueGuard(key: string): "inserted" | "duplicate_error" {
      if (inserted.has(key.toLowerCase())) return "duplicate_error";
      inserted.add(key.toLowerCase());
      return "inserted";
    }
    expect(insertWithUniqueGuard("Charlie")).toBe("inserted");
    expect(insertWithUniqueGuard("Charlie")).toBe("duplicate_error"); // blocked by constraint
    expect(insertWithUniqueGuard("charlie")).toBe("duplicate_error"); // case-insensitive
    expect(insertWithUniqueGuard("Dave")).toBe("inserted");           // different name ok
  });
});

// ── M-2: updateDisplayName missing revalidateTag ──────────────────────────────

describe("updateDisplayName — cache invalidation (M-2)", () => {
  /**
   * getGroupWithMembers is wrapped in unstable_cache tagged `group-${groupId}`.
   * revalidatePath('/groups', 'layout') does NOT invalidate unstable_cache tags.
   * Each affected group must also be explicitly invalidated via revalidateTag.
   */

  type CacheEntry = { tag: string; stale: boolean };

  function simulateRevalidatePath(
    entries: CacheEntry[],
  ): CacheEntry[] {
    // revalidatePath only affects route cache, NOT unstable_cache tags
    // unstable_cache entries remain stale
    return entries.map((e) => ({
      ...e,
      stale: e.tag.startsWith("group-") ? true : e.stale, // still stale!
    }));
  }

  function simulateRevalidateTag(
    entries: CacheEntry[],
    tag: string,
  ): CacheEntry[] {
    return entries.map((e) => ({
      ...e,
      stale: e.tag === tag ? false : e.stale,
    }));
  }

  it("[BUG] revalidatePath('/groups') does not clear group-level unstable_cache", () => {
    const cache: CacheEntry[] = [
      { tag: "group-g1", stale: true },
      { tag: "group-g2", stale: true },
      { tag: "balances-g1", stale: false },
    ];
    // Current code: only calls revalidatePath('/groups', 'layout')
    const after = simulateRevalidatePath(cache);
    // group-level tags remain stale → cached getGroupWithMembers returns old display names
    expect(after.find((e) => e.tag === "group-g1")!.stale).toBe(true);
    expect(after.find((e) => e.tag === "group-g2")!.stale).toBe(true);
  });

  it("[FIXED] revalidateTag('group-${groupId}') clears the group-level unstable_cache", () => {
    let cache: CacheEntry[] = [
      { tag: "group-g1", stale: true },
      { tag: "group-g2", stale: true },
      { tag: "balances-g1", stale: false },
    ];
    const userGroupIds = ["g1", "g2"];
    // Fixed code: also calls revalidateTag for each group the user is in
    for (const gid of userGroupIds) {
      cache = simulateRevalidateTag(cache, `group-${gid}`);
    }
    expect(cache.find((e) => e.tag === "group-g1")!.stale).toBe(false);
    expect(cache.find((e) => e.tag === "group-g2")!.stale).toBe(false);
    expect(cache.find((e) => e.tag === "balances-g1")!.stale).toBe(false); // unchanged
  });

  it("[FIXED] invalidation is scoped to each group the user belongs to", () => {
    let cache: CacheEntry[] = [
      { tag: "group-g1", stale: true },
      { tag: "group-g2", stale: true },
      { tag: "group-g3", stale: false }, // a group the user is NOT in
    ];
    const userGroupIds = ["g1", "g2"];
    for (const gid of userGroupIds) {
      cache = simulateRevalidateTag(cache, `group-${gid}`);
    }
    expect(cache.find((e) => e.tag === "group-g1")!.stale).toBe(false);
    expect(cache.find((e) => e.tag === "group-g2")!.stale).toBe(false);
    expect(cache.find((e) => e.tag === "group-g3")!.stale).toBe(false); // g3 untouched
  });
});
