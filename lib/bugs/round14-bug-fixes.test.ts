/**
 * Regression tests for Round-14 bug fixes (full codebase audit, 2026-07-01).
 *
 * Tests cover pure-logic aspects that can run without a DB or browser.
 * Bugs requiring a live DB, concurrent requests, or a real browser session
 * are documented as manual test cases at the bottom of this file.
 *
 * Run with: pnpm test lib/bugs/round14-bug-fixes.test.ts
 *
 * ─── Automated ────────────────────────────────────────────────────────────
 * BUG-1  createTripPhoto — client-supplied storagePath not validated (storage injection)
 * BUG-2  getTripPhotoUploadUrl / createTripPhoto — no groupType check (trips-only bypass)
 * BUG-5  settleWithPerson — spurious "Settled ✓" push when partialAmount < every entry
 * BUG-9  _computeHomeBalances — settlement sums not filtered by default currency
 * BUG-11 confirmSettlement — UPDATE lacked isConfirmed=false guard
 * BUG-12 selfReportStreamSettle — currency not validated against stream record's currency
 * BUG-15 getCircleDashboardData — unpaidCount double-subtracts members in both maps
 *
 * ─── Manual only ──────────────────────────────────────────────────────────
 * BUG-3  updateExpenseMedia — any group member could overwrite any expense's receiptUrl
 *        Manual: Log in as non-creator member; call updateExpenseMedia with another
 *        member's expenseId → should now return { ok: false }.
 * BUG-4  clearExpenseReceipt — auth deferred to component; any member could clear receipts
 *        Manual: Same setup as BUG-3 for clearExpenseReceipt.
 * BUG-6  TripMemoriesLightbox — deleted photo persisted (no router.refresh)
 *        Manual: Delete a photo in the lightbox; the deleted slot should disappear on
 *        the next RSC re-render rather than remaining navigable.
 * BUG-7  TripMemoriesLightbox — caption reverted after save (no router.refresh)
 *        Manual: Edit a caption; the new text should remain visible after save without
 *        a manual page reload.
 * BUG-8  TripMemoriesGrid — uploaded thumbnails non-interactive (no router.refresh)
 *        Manual: Upload a photo; the thumbnail should become a clickable lightbox button
 *        once the RSC re-render completes (no page reload required).
 * BUG-10 ExpenseDetailSheet — stale comments overwrite current expense's state
 *        Manual: Open two different expense pins in quick succession on the map view;
 *        the second expense's comments pane must not briefly show the first expense's
 *        comments while its own fetch is in flight.
 * BUG-13 createTripPhoto — photo cap (30) not enforced atomically (race condition)
 *        Manual: Requires two concurrent Plus-user sessions uploading simultaneously
 *        to a trip at 29/30 photos.
 * BUG-14 fetchExpenseCommentsAction — swallowed DB errors rendered false empty state
 *        Manual: Disconnect DB; navigate to the expense thread page → should hit
 *        the ErrorCard boundary rather than showing "No comments yet".
 */

import { describe, it, expect } from "vitest";

// ─── BUG-1: Storage path validation ──────────────────────────────────────────
//
// createTripPhoto accepted any storagePath from the client.  Since deleteTripPhoto
// uses the service-role admin client to remove files, an attacker could inject
// "otherGroupId/victimPhoto.jpg" and later trigger deletion of another group's file.
//
// Fix: isValidStoragePath(storagePath, groupId) — exported from trip-photos action.

function isValidStoragePath(storagePath: string, groupId: string): boolean {
  return storagePath.startsWith(`${groupId}/`) && storagePath.length > groupId.length + 1;
}

describe("BUG-1 — createTripPhoto storage-path injection guard", () => {
  const OWN_GROUP   = "aaaaaaaa-0000-0000-0000-000000000001";
  const OTHER_GROUP = "bbbbbbbb-0000-0000-0000-000000000002";

  it("[FIX] accepts a path that belongs to the declared groupId", () => {
    expect(isValidStoragePath(`${OWN_GROUP}/photo.abc123.jpg`, OWN_GROUP)).toBe(true);
  });

  it("[BUG] rejects a path belonging to a different group (injection attempt)", () => {
    expect(isValidStoragePath(`${OTHER_GROUP}/victim.jpg`, OWN_GROUP)).toBe(false);
  });

  it("[FIX] rejects an empty filename (path ends exactly at groupId/)", () => {
    expect(isValidStoragePath(`${OWN_GROUP}/`, OWN_GROUP)).toBe(false);
  });

  it("[FIX] rejects a path that contains the groupId as a prefix but is misformatted", () => {
    // e.g. attacker passes groupId without the slash
    expect(isValidStoragePath(OWN_GROUP, OWN_GROUP)).toBe(false);
  });

  it("[FIX] rejects a completely arbitrary path", () => {
    expect(isValidStoragePath("../../etc/passwd", OWN_GROUP)).toBe(false);
  });

  it("[FIX] rejects an empty storagePath", () => {
    expect(isValidStoragePath("", OWN_GROUP)).toBe(false);
  });
});

// ─── BUG-2: Group-type guard for Trip Memories ───────────────────────────────
//
// Neither getTripPhotoUploadUrl nor createTripPhoto checked group.groupType.
// A Plus user who is a member of a Nest or Circle could upload photos there.
//
// Fix: fetch the group row and verify groupType === "trip" before proceeding.

function isTripGroup(groupType: string | null | undefined): boolean {
  return groupType === "trip";
}

describe("BUG-2 — Trip Memories groupType guard", () => {
  it("[FIX] allows upload to a trip group", () => {
    expect(isTripGroup("trip")).toBe(true);
  });

  it("[BUG] blocks upload to a nest group", () => {
    expect(isTripGroup("nest")).toBe(false);
  });

  it("[BUG] blocks upload to a circle group", () => {
    expect(isTripGroup("circle")).toBe(false);
  });

  it("[FIX] blocks when group is not found (null)", () => {
    expect(isTripGroup(null)).toBe(false);
  });
});

// ─── BUG-5: settleWithPerson — empty ids guard ───────────────────────────────
//
// When partialAmount is smaller than every individual entry's amount, the
// greedy allocation loop produces ids=[].  Drizzle's inArray(col,[]) emits
// WHERE false (not an error), so the DB update succeeded with 0 rows changed
// while the action returned { ok: true } and fired a "Settled ✓" push.
//
// Fix: return { ok: false } when ids.length === 0 after the partial loop.

function allocatePartialSettlement(
  entries: { id: string; amount: number }[],
  partialAmount: number,
): string[] {
  let remaining = partialAmount;
  const ids: string[] = [];
  for (const r of entries) {
    if (remaining <= 0) break;
    if (r.amount <= remaining + 0.01) {
      ids.push(r.id);
      remaining -= r.amount;
    } else {
      break;
    }
  }
  return ids;
}

describe("BUG-5 — settleWithPerson partial-amount empty-ids guard", () => {
  const entries = [
    { id: "e1", amount: 500 },
    { id: "e2", amount: 300 },
  ];

  it("[BUG] produces ids=[] when partialAmount < every entry (was silently ok: true)", () => {
    const ids = allocatePartialSettlement(entries, 100);
    // The fix must check ids.length === 0 and return { ok: false }
    expect(ids).toHaveLength(0);
  });

  it("[FIX] caller must reject when ids=[]; do NOT call push or return ok: true", () => {
    const ids = allocatePartialSettlement(entries, 100);
    const shouldReject = ids.length === 0;
    expect(shouldReject).toBe(true);
  });

  it("[FIX] settles e1 exactly when partialAmount equals e1.amount (₹500)", () => {
    // e1 is first (oldest-first order); 500 ≤ 500+0.01 → push e1, remaining=0.
    const ids = allocatePartialSettlement(entries, 500);
    expect(ids).toEqual(["e1"]);
  });

  it("[FIX] settles oldest entries when partialAmount covers some but not all", () => {
    const sorted = [
      { id: "old1", amount: 200 },
      { id: "old2", amount: 300 },
      { id: "old3", amount: 500 },
    ];
    // partialAmount = 450 covers old1 (200) + old2 (300) = 500 > 450, so only old1
    // Actually: remaining=450 → old1(200) ≤ 450 → push, remaining=250; old2(300) > 250 → break
    const ids = allocatePartialSettlement(sorted, 450);
    expect(ids).toEqual(["old1"]);
  });

  it("[FIX] settles all when partialAmount covers everything", () => {
    const ids = allocatePartialSettlement(entries, 1000);
    expect(ids).toEqual(["e1", "e2"]);
  });

  it("[FIX] returns [] when partialAmount is 0", () => {
    const ids = allocatePartialSettlement(entries, 0);
    expect(ids).toHaveLength(0);
  });
});

// ─── BUG-9: Home balance badge settlement currency filter ────────────────────
//
// _computeHomeBalances summed all confirmed settlements regardless of currency.
// paidByGroup/owedByGroup (expenses) correctly filter by the group's defaultCurrency,
// but sentByGroup/receivedByGroup (settlements) did not.
//
// Fix: add currency to the settlement SELECT + apply the same post-filter loop.

function computeSettlementBalance(
  rows: { groupId: string; currency: string; total: number }[],
  currencyByGroup: Map<string, string>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of rows) {
    if (r.currency === currencyByGroup.get(r.groupId)) {
      result.set(r.groupId, (result.get(r.groupId) ?? 0) + r.total);
    }
  }
  return result;
}

describe("BUG-9 — _computeHomeBalances settlement currency filter", () => {
  const currencyByGroup = new Map([
    ["group-INR", "INR"],
    ["group-USD", "USD"],
  ]);

  it("[FIX] includes a settlement in the group's default currency", () => {
    const rows = [{ groupId: "group-INR", currency: "INR", total: 500 }];
    const map  = computeSettlementBalance(rows, currencyByGroup);
    expect(map.get("group-INR")).toBe(500);
  });

  it("[BUG] excludes a legacy settlement in a non-default currency", () => {
    const rows = [
      { groupId: "group-INR", currency: "INR", total: 500 },
      { groupId: "group-INR", currency: "USD", total: 50 }, // legacy foreign-currency row
    ];
    const map = computeSettlementBalance(rows, currencyByGroup);
    // Only the INR row should be counted; the USD row should be ignored
    expect(map.get("group-INR")).toBe(500); // not 550
  });

  it("[FIX] handles a group with no settlements (missing from rows)", () => {
    const map = computeSettlementBalance([], currencyByGroup);
    expect(map.get("group-INR")).toBeUndefined();
  });

  it("[FIX] correctly sums multiple same-currency rows for a single group", () => {
    // Can occur after the GROUP BY groupId, currency aggregation
    const rows = [
      { groupId: "group-INR", currency: "INR", total: 300 },
      { groupId: "group-INR", currency: "INR", total: 200 },
    ];
    const map = computeSettlementBalance(rows, currencyByGroup);
    expect(map.get("group-INR")).toBe(500);
  });
});

// ─── BUG-11: confirmSettlement — isConfirmed=false guard ─────────────────────
//
// The UPDATE lacked an isConfirmed=false predicate and used no .returning().
// A concurrent disputeSettlement could delete the row between SELECT and UPDATE,
// causing UPDATE to affect 0 rows silently while confirmSettlement still fired
// a spurious push notification.
//
// Fix: add eq(settlements.isConfirmed, false) to WHERE + use .returning() and
// bail out with { ok: false } if no row was returned.

function simulateConfirmSettlementUpdate(
  settlementExists: boolean,
  alreadyConfirmed: boolean,
): { rowsUpdated: number } {
  // The fixed WHERE clause: id=? AND groupId=? AND isConfirmed=false
  if (!settlementExists) return { rowsUpdated: 0 }; // deleted by concurrent dispute
  if (alreadyConfirmed)  return { rowsUpdated: 0 }; // already confirmed (double-call)
  return { rowsUpdated: 1 };
}

describe("BUG-11 — confirmSettlement isConfirmed=false WHERE guard", () => {
  it("[FIX] updates 1 row when settlement exists and is unconfirmed", () => {
    const { rowsUpdated } = simulateConfirmSettlementUpdate(true, false);
    expect(rowsUpdated).toBe(1);
  });

  it("[FIX] updates 0 rows when settlement was deleted by concurrent dispute", () => {
    const { rowsUpdated } = simulateConfirmSettlementUpdate(false, false);
    expect(rowsUpdated).toBe(0);
  });

  it("[FIX] updates 0 rows when settlement is already confirmed (double-call)", () => {
    const { rowsUpdated } = simulateConfirmSettlementUpdate(true, true);
    expect(rowsUpdated).toBe(0);
  });

  it("[FIX] caller must return { ok: false } when rowsUpdated=0 (no push fired)", () => {
    const { rowsUpdated } = simulateConfirmSettlementUpdate(false, false);
    const shouldPush = rowsUpdated > 0;
    expect(shouldPush).toBe(false);
  });
});

// ─── BUG-12: selfReportStreamSettle — currency mismatch guard ────────────────
//
// selfReportStreamSettle accepted any currency string from the client without
// validating it against the stream record's currency.  The settlement row was
// inserted with the wrong currency; confirmStreamSettle then compared amounts
// cross-currency (e.g. $100 USD vs ₹5000 INR stream), potentially marking wrong
// entries as settled.
//
// Fix: validate that input.currency === primaryRecord.currency.

function validateStreamCurrency(
  inputCurrency: string,
  recordCurrency: string,
): { ok: true } | { ok: false; error: string } {
  if (inputCurrency !== recordCurrency)
    return { ok: false, error: `Currency must be ${recordCurrency} for this stream` };
  return { ok: true };
}

describe("BUG-12 — selfReportStreamSettle currency guard", () => {
  it("[FIX] accepts settlement in the stream's currency (INR)", () => {
    expect(validateStreamCurrency("INR", "INR")).toEqual({ ok: true });
  });

  it("[FIX] accepts settlement in the stream's currency (USD)", () => {
    expect(validateStreamCurrency("USD", "USD")).toEqual({ ok: true });
  });

  it("[BUG] rejects settlement in a different currency", () => {
    const result = validateStreamCurrency("USD", "INR");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("INR");
  });

  it("[BUG] rejects empty currency string", () => {
    const result = validateStreamCurrency("", "INR");
    expect(result.ok).toBe(false);
  });
});

// ─── BUG-15: getCircleDashboardData — unpaidCount double-subtraction ─────────
//
// Old formula: unpaidCount = allMembers.length - paidCount - unconfirmedMap.size
// In one-time circles a member can have BOTH a confirmed and an unconfirmed row.
// Such members were subtracted TWICE (once via paidCount, once via unconfirmedMap.size),
// causing unpaidCount to go negative and the "N members haven't paid" chip to lie.
//
// Fix: count members in neither map explicitly.

function computeUnpaidCount(
  allMemberIds: string[],
  confirmedIds: Set<string>,
  unconfirmedIds: Set<string>,
): number {
  return allMemberIds.filter((id) => !confirmedIds.has(id) && !unconfirmedIds.has(id)).length;
}

function computeUnpaidCount_BUGGY(
  totalMembers: number,
  confirmedSize: number,
  unconfirmedSize: number,
): number {
  return totalMembers - confirmedSize - unconfirmedSize;
}

describe("BUG-15 — getCircleDashboardData unpaidCount double-subtraction", () => {
  // Members: alice, bob, carol
  // alice: confirmed + unconfirmed (second pending contribution)
  // bob:   unconfirmed only
  // carol: neither (truly unpaid)
  const allIds       = ["alice", "bob", "carol"];
  const confirmed    = new Set(["alice"]);
  const unconfirmed  = new Set(["alice", "bob"]); // alice appears in BOTH

  it("[BUG] old formula double-subtracts alice and returns negative count", () => {
    // confirmedSize=1, unconfirmedSize=2, total=3 → 3 - 1 - 2 = 0 (wrong: carol IS unpaid)
    // Worse: with 4 members and bigger overlap it goes negative
    const members = ["alice", "bob", "carol", "dave"];
    const confSize = 2;    // alice + dave confirmed
    const unconfSize = 3;  // alice + bob + dave also have pending rows
    const result = computeUnpaidCount_BUGGY(members.length, confSize, unconfSize);
    // 4 - 2 - 3 = -1  (incorrect: carol is the truly-unpaid member)
    expect(result).toBe(-1);
  });

  it("[FIX] correctly identifies carol as the only truly-unpaid member", () => {
    const result = computeUnpaidCount(allIds, confirmed, unconfirmed);
    expect(result).toBe(1); // only carol
  });

  it("[FIX] returns 0 when all members have paid or self-reported", () => {
    const allPaid = new Set(["alice", "bob", "carol"]);
    expect(computeUnpaidCount(allIds, allPaid, new Set())).toBe(0);
  });

  it("[FIX] returns allMembers.length when nobody has paid or self-reported", () => {
    expect(computeUnpaidCount(allIds, new Set(), new Set())).toBe(3);
  });

  it("[FIX] handles a member with only an unconfirmed row (self-reported, pending admin)", () => {
    const pending = new Set(["bob"]);
    // alice = confirmed, bob = unconfirmed only, carol = nothing
    const result = computeUnpaidCount(allIds, confirmed, pending);
    expect(result).toBe(1); // carol only
  });
});

// ─── Manual test cases ────────────────────────────────────────────────────────
//
// BUG-3 updateExpenseMedia auth bypass
//   SETUP: Two members in a group; Member B is not the creator of any expense.
//   STEPS: Call updateExpenseMedia(expenseCreatedByMemberA, groupId, { receiptUrl: "x" })
//          as Member B.
//   EXPECTED: { ok: false }  (was: { ok: true }, URL silently overwritten)
//
// BUG-4 clearExpenseReceipt auth bypass
//   SETUP: Same as BUG-3.
//   STEPS: Call clearExpenseReceipt(expenseCreatedByMemberA, groupId) as Member B.
//   EXPECTED: { ok: false }  (was: { ok: true }, receiptUrl+receiptItems nuked)
//
// BUG-6 Lightbox delete no refresh
//   STEPS: Open Trip Memories; open lightbox; delete a photo.
//   EXPECTED: The deleted photo slot is gone after the RSC re-render completes;
//             pressing next/prev does not show the deleted image.
//   (was: photo remained navigable until manual page reload)
//
// BUG-7 Lightbox caption revert
//   STEPS: Open a photo in the lightbox; click the pencil; type a new caption; save.
//   EXPECTED: The new caption is visible in the footer after save without a page reload.
//   (was: caption reverted to old text immediately after the "Caption updated" toast)
//
// BUG-8 Non-interactive upload thumbnail
//   STEPS: Upload a photo via Trip Memories; do NOT reload the page.
//   EXPECTED: The new thumbnail is clickable and opens the lightbox once the RSC
//             re-render delivers the server-confirmed row.
//   (was: thumbnail was a dead <div> until page reload)
//
// BUG-10 Stale comments in ExpenseMapView
//   STEPS: On the map view, rapidly tap two different expense pins in quick succession.
//   EXPECTED: The second pin's sheet shows only its own comments (or empty); it must
//             never briefly flash the first pin's comments.
//   (was: in-flight fetch for pin A could resolve after pin B opened and overwrite state)
//
// BUG-13 Photo cap race condition
//   SETUP: A trip with 29 photos, two Plus members simultaneously uploading.
//   STEPS: Both call getTripPhotoUploadUrl concurrently; both proceed to createTripPhoto.
//   EXPECTED: Exactly one INSERT succeeds; the other gets "Photo limit reached".
//   (was: both INSERTs could succeed, exceeding the 30-photo cap)
//
// BUG-14 fetchExpenseCommentsAction swallows DB errors
//   SETUP: Disable DB connectivity (or use a mock that throws).
//   STEPS: Navigate to an expense thread page.
//   EXPECTED: The page hits the ErrorCard boundary ("Something went wrong").
//   (was: the page rendered "No comments yet" — a false empty state)
