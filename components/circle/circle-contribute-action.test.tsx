// Verifies the audit fix: CircleContributeAction now resyncs its optimistic
// localPaid/localPendingConfirm state when the server-confirmed isPaid/
// isPendingConfirm props change, instead of only seeding them once via
// useState. Without the fix, a member stuck at "Awaiting confirmation" would
// stay there even after the admin confirms, until a full unmount/remount.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircleContributeAction } from "./circle-contribute-action";

vi.mock("@/app/actions/circle", () => ({ selfReportContribution: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/haptics", () => ({ hapticLight: vi.fn(), hapticSuccess: vi.fn() }));

vi.mock("@/components/payment/upi-pay-button", () => ({
  UpiPayButton: () => <div>UPI_PAY_BUTTON</div>,
}));
vi.mock("@/components/payment/payment-confirm-prompt", () => ({
  PaymentConfirmPrompt: () => null,
}));
vi.mock("@/components/payment/payment-pending-badge", () => ({
  PaymentPendingBadge: () => <div>AWAITING_CONFIRMATION</div>,
}));

const baseProps = {
  groupId: "g1",
  groupName: "Test Circle",
  amount: 500,
  currency: "INR",
  period: "2026-06",
  periodLabel: "June 2026",
  isRecurring: true,
  upiId: null,
  size: "dashboard" as const,
  circleMode: "recurring" as const,
};

describe("CircleContributeAction — prop resync (audit fix)", () => {
  it("updates from pending-confirmation to paid when props change, without unmounting", () => {
    const { rerender } = render(
      <CircleContributeAction {...baseProps} isPaid={false} isPendingConfirm={true} />
    );

    expect(screen.getByText("AWAITING_CONFIRMATION")).toBeInTheDocument();

    // Simulate the admin confirming — parent re-renders with fresh server props,
    // component itself is NOT unmounted/remounted.
    rerender(
      <CircleContributeAction {...baseProps} isPaid={true} isPendingConfirm={false} />
    );

    expect(screen.queryByText("AWAITING_CONFIRMATION")).not.toBeInTheDocument();
    expect(screen.getByText(/you're clear for/i)).toBeInTheDocument();
  });

  it("updates from paid back to unpaid when props change (e.g. a dispute reverses it)", () => {
    const { rerender } = render(
      <CircleContributeAction {...baseProps} isPaid={true} isPendingConfirm={false} />
    );
    expect(screen.getByText(/you're clear for/i)).toBeInTheDocument();

    rerender(
      <CircleContributeAction {...baseProps} isPaid={false} isPendingConfirm={false} />
    );

    expect(screen.queryByText(/you're clear for/i)).not.toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});
