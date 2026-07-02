// Verifies the audit fix: confirmPassPurchase now catches its own DB-write
// errors and returns { ok: false, error } instead of throwing. The client's
// Razorpay `handler` callback has no try/catch of its own (see
// checkout-form.tsx), so an unhandled throw here previously left the checkout
// button frozen forever with no toast — even though the user had already paid.
import { describe, it, expect, vi, afterEach } from "vitest";

const TEST_USER_ID = crypto.randomUUID();
const ORDER_ID = "order_test123";
const PAYMENT_ID = "pay_test123";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: TEST_USER_ID, user_metadata: { full_name: "Tester" } }) as never),
  };
});

vi.mock("@/lib/razorpay/verify", () => ({
  verifyCheckoutSignature: vi.fn(() => true),
}));

vi.mock("@/lib/razorpay/credentials", () => ({
  getRazorpayMode: vi.fn(() => "test"),
  getRazorpayKeyId: vi.fn(() => "rzp_test_key"),
  getRazorpayKeySecret: vi.fn(() => "test-secret"),
}));

vi.mock("@/lib/razorpay/client", () => ({
  fetchOrder: vi.fn(async () => ({
    id: ORDER_ID,
    notes: { userId: TEST_USER_ID, passType: "pass_30d", earlyBird: "false" },
  })),
  createOrder: vi.fn(),
}));

vi.mock("@/lib/notifications/send-admin-alert", () => ({
  recordAdminEvent: vi.fn(async () => {}),
}));

const { db } = await import("@/lib/db/client");
const { confirmPassPurchase } = await import("@/app/actions/subscription");

describe("confirmPassPurchase — DB failure after a verified payment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns { ok: false } instead of throwing when the DB insert fails", async () => {
    vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("simulated connection-pool exhaustion");
    });

    // Must not throw — the whole point of the fix.
    const result = await confirmPassPurchase(ORDER_ID, PAYMENT_ID, "fake-signature");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
