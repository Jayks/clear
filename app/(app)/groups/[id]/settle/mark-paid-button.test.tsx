// Verifies the audit fix: MarkPaidButton now calls router.refresh() on a
// successful recordSettlement, matching every sibling mutation on this page
// (suggestion-cards.tsx handleMarkPaid, PendingConfirmations.handleConfirm,
// ExternalPaymentsPending.handleConfirm). Previously it only refreshed inside
// the toast's Undo callback, so marking a settlement paid for two OTHER
// members left the balances/list stale on screen despite the write succeeding.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MarkPaidButton } from "./mark-paid-button";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/haptics", () => ({ hapticSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recordSettlementMock = vi.fn();
vi.mock("@/app/actions/settlements", () => ({
  recordSettlement: (...args: unknown[]) => recordSettlementMock(...args),
  deleteSettlement: vi.fn(),
}));

const props = {
  groupId: "g1",
  fromMemberId: "m1",
  toMemberId: "m2",
  amount: 500,
  currency: "INR",
};

describe("MarkPaidButton", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    recordSettlementMock.mockReset();
  });

  it("calls router.refresh() after a successful mark-paid, not just inside Undo", async () => {
    recordSettlementMock.mockResolvedValue({ ok: true, settlementId: "s1" });

    render(<MarkPaidButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /mark paid/i }));

    await waitFor(() => expect(recordSettlementMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("does NOT call router.refresh() when recordSettlement fails", async () => {
    recordSettlementMock.mockResolvedValue({ ok: false, error: "Something went wrong" });

    render(<MarkPaidButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /mark paid/i }));

    await waitFor(() => expect(recordSettlementMock).toHaveBeenCalledTimes(1));
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
