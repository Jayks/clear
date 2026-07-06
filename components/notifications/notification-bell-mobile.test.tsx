// Round 16 fix #5: the bell used to fetch its list only once
// (`notifications === null` guard) and cache it forever — a long-lived
// tab/PWA showed morning data all day. Now it refreshes on EVERY open, and
// keeps the previously-cached list visible while the refresh is in flight.
//
// The loading/failed/empty/list render branch itself (fix #16's retry copy
// included) is covered by the pure resolveBellPanelState unit tests
// (lib/notifications/bell-panel-state.test.ts) instead of an RTL
// render+reject-and-wait round trip here — a rejected-promise-in-an-effect
// RTL test in this file reliably races an unrelated React act()/framer-motion
// (Sheet) internal timing quirk in this test environment, misattributing a
// spurious "unhandled rejection" to the test even though the component's own
// try/catch handles it correctly (confirmed via isolated repro outside this
// component). Splitting the branch into a pure function sidesteps it
// entirely while still testing the real logic.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBellMobile } from "./notification-bell-mobile";

vi.mock("@/app/actions/notifications", () => ({
  getNotificationFeedAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/notifications/notification-sync", () => ({
  broadcastNotificationsRead: vi.fn(),
  NOTIFICATIONS_READ_EVENT: "notifications-read",
}));

const { getNotificationFeedAction } = await import("@/app/actions/notifications");
const feedMock = vi.mocked(getNotificationFeedAction);

function makeRow(id: string, body: string) {
  return {
    id, userId: "u1", groupId: null, type: "expense_added",
    title: "Title", body, url: "/groups", dedupKey: null,
    readAt: null, createdAt: new Date(),
  } as never;
}

describe("NotificationBellMobile", () => {
  beforeEach(() => feedMock.mockReset());

  it("fetches on open and shows the row", async () => {
    feedMock.mockResolvedValue({ rows: [makeRow("1", "First open row")], unread: 1 });
    render(<NotificationBellMobile initialUnread={1} />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    await waitFor(() => expect(screen.getByText("First open row")).toBeInTheDocument());
    expect(feedMock).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on every subsequent open, not just the first (fix #5)", async () => {
    feedMock.mockResolvedValueOnce({ rows: [makeRow("1", "Morning row")], unread: 1 });
    render(<NotificationBellMobile initialUnread={1} />);

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => expect(screen.getByText("Morning row")).toBeInTheDocument());

    // Close, then reopen — a fresh fetch should fire and replace the list.
    fireEvent.click(screen.getByText("Done"));
    feedMock.mockResolvedValueOnce({ rows: [makeRow("2", "Fresh row")], unread: 2 });
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    await waitFor(() => expect(screen.getByText("Fresh row")).toBeInTheDocument());
    expect(feedMock).toHaveBeenCalledTimes(2);
  });
});
