// Integration test against the REAL dev database. Round 16 fix #7:
// selfReportExternalPayment (the one PUBLIC, unauthenticated money-adjacent
// action) had no Zod validation — paidAmount only checked `<= 0`.
// Infinity/absurd values passed through, overflowed numeric(12,2), and the
// resulting DB error propagated as an uncaught throw past the action (the
// guest taps Confirm and nothing visibly happens). Verifies the fix: bad
// input now returns {ok:false} instead of throwing, and a valid amount is
// rounded to 2 decimals before storage.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/notifications/send-push-notification", () => ({
  sendPushToUser: vi.fn(async () => {}),
}));

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { paymentRequests } = await import("@/lib/db/schema/payment-requests");
const { circleContributions } = await import("@/lib/db/schema/circle-contributions");
const { selfReportExternalPayment } = await import("@/app/actions/payment-requests");
const { eq } = await import("drizzle-orm");

const ADMIN_USER_ID = crypto.randomUUID();

describe("selfReportExternalPayment — input validation (Round 16 fix #7)", () => {
  let groupId: string;

  // A fresh ghost member (and payment request) per call — the unique index
  // `payment_requests_one_live_per_payer` scopes to (group, payer, payee,
  // period), so reusing the same ghost across test cases would collide with
  // the still-"pending" row left behind by any rejected (validation-failed)
  // self-report in an earlier test.
  async function makeFlexiRequest() {
    const guestName = `Ghost Payer ${crypto.randomUUID()}`;
    const [ghost] = await db
      .insert(groupMembers)
      .values({ groupId, guestName, role: "member" })
      .returning({ id: groupMembers.id });

    const [row] = await db
      .insert(paymentRequests)
      .values({
        contextType:     "circle",
        groupId,
        groupName:       "Test Circle",
        amount:          null, // Flexi
        currency:        "INR",
        payerName:       guestName,
        payerMemberId:   ghost.id,
        payeeUserId:     ADMIN_USER_ID,
        payeeName:       "Admin",
        status:          "pending",
        createdByUserId: ADMIN_USER_ID,
        expiresAt:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning({ token: paymentRequests.token, id: paymentRequests.id });
    return row;
  }

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Self-Report Validation Test (auto-cleaned)", groupType: "circle", circleMode: "one_time", defaultCurrency: "INR", createdBy: ADMIN_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    await db.insert(groupMembers).values({ groupId, userId: ADMIN_USER_ID, displayName: "Admin", role: "admin" });
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("rejects paidAmount: Infinity with {ok:false}, not a throw", async () => {
    const { token } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "cash", undefined, Infinity);
    expect(result.ok).toBe(false);
  });

  it("rejects an absurdly large paidAmount (1e13) with {ok:false}", async () => {
    const { token } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "cash", undefined, 1e13);
    expect(result.ok).toBe(false);
  });

  it("rejects NaN paidAmount with {ok:false}", async () => {
    const { token } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "cash", undefined, NaN);
    expect(result.ok).toBe(false);
  });

  it("rounds a valid paidAmount (500.555) to 2 decimals before storing", async () => {
    const { token, id } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "cash", undefined, 500.555);
    expect(result.ok).toBe(true);

    const [updated] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    expect(updated.status).toBe("self_reported");

    const [contrib] = await db
      .select()
      .from(circleContributions)
      .where(eq(circleContributions.id, updated.contributionId!));
    expect(contrib.amount).toBe("500.56");
  });

  it("valid path (a sane amount) still succeeds", async () => {
    const { token } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "upi", "UTR123", 250);
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid payment method with {ok:false}", async () => {
    const { token } = await makeFlexiRequest();
    // @ts-expect-error — deliberately invalid method to exercise the Zod guard
    const result = await selfReportExternalPayment(token, "crypto", undefined, 100);
    expect(result.ok).toBe(false);
  });

  it("rejects a too-long utrReference with {ok:false}", async () => {
    const { token } = await makeFlexiRequest();
    const result = await selfReportExternalPayment(token, "upi", "x".repeat(31), 100);
    expect(result.ok).toBe(false);
  });
});
