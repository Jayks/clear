// Integration test against the REAL dev database (see circle-expense-race.test.ts
// for rationale — these two bugs can only be exercised with real concurrent
// Postgres transactions).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const USER_A = crypto.randomUUID(); // creditor in both scenarios below
const USER_B = crypto.randomUUID(); // debtor in both scenarios below

// Mutable so each test can act as a different party without re-mocking modules.
let currentUserId = USER_A;

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: currentUserId, user_metadata: {} }) as never),
  };
});

const { db } = await import("@/lib/db/client");
const { streamRecords } = await import("@/lib/db/schema/stream-records");
const { streamSettlements } = await import("@/lib/db/schema/stream-settlements");
const { settleStream, confirmStreamSettle } = await import("@/app/actions/stream");
const { eq } = await import("drizzle-orm");

describe("settleStream — over-settlement race (live-DB integration)", () => {
  let recordId: string;

  beforeEach(async () => {
    currentUserId = USER_A;
    const [record] = await db
      .insert(streamRecords)
      .values({
        creatorId: USER_A,
        counterpartId: USER_B,
        amount: "100.00",
        currency: "INR",
        direction: "they_owe_me",
        status: "pending",
      })
      .returning({ id: streamRecords.id });
    recordId = record.id;
  });

  afterEach(async () => {
    if (recordId) await db.delete(streamRecords).where(eq(streamRecords.id, recordId)); // cascades settlements
  });

  it("allows exactly one of two concurrent ₹60 settlements against a ₹100 entry, never over-settling it", async () => {
    const input = { streamId: recordId, amount: 60 };

    const [r1, r2] = await Promise.all([
      settleStream(input as never),
      settleStream(input as never),
    ]);

    const results = [r1, r2];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    const failure = failed[0];
    if (!failure.ok) expect(failure.error).toMatch(/exceeds the remaining balance/i);

    const settledRows = await db
      .select({ amount: streamSettlements.amount })
      .from(streamSettlements)
      .where(eq(streamSettlements.streamId, recordId));
    const totalSettled = settledRows.reduce((s, r) => s + Number(r.amount), 0);
    expect(totalSettled).toBeLessThanOrEqual(100.01);
    expect(totalSettled).toBe(60); // exactly one of the two settlements landed
  }, 20000);
});

describe("confirmStreamSettle — double-confirm race (live-DB integration)", () => {
  let recordId: string;
  let settlementId: string;

  beforeEach(async () => {
    const [record] = await db
      .insert(streamRecords)
      .values({
        creatorId: USER_A,
        counterpartId: USER_B,
        amount: "100.00",
        currency: "INR",
        direction: "they_owe_me",
        status: "pending",
      })
      .returning({ id: streamRecords.id });
    recordId = record.id;

    // USER_B (debtor) self-reported paying the full amount; awaiting USER_A's confirm.
    const [settlement] = await db
      .insert(streamSettlements)
      .values({
        streamId: recordId,
        amount: "100.00",
        currency: "INR",
        recordedBy: USER_B,
        isConfirmed: false,
      })
      .returning({ id: streamSettlements.id });
    settlementId = settlement.id;

    currentUserId = USER_A; // the creditor, authorised to confirm
  });

  afterEach(async () => {
    if (recordId) await db.delete(streamRecords).where(eq(streamRecords.id, recordId)); // cascades settlements
  });

  it("allows exactly one of two concurrent confirms to succeed", async () => {
    const [r1, r2] = await Promise.all([
      confirmStreamSettle(settlementId),
      confirmStreamSettle(settlementId),
    ]);

    const results = [r1, r2];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    const failure = failed[0];
    if (!failure.ok) expect(failure.error).toMatch(/already confirmed/i);

    const [record] = await db
      .select({ status: streamRecords.status })
      .from(streamRecords)
      .where(eq(streamRecords.id, recordId));
    expect(record.status).toBe("settled");
  }, 20000);
});
