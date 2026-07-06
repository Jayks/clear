// Round 16 fix #1: /notifications pagination showed a stale list. Prev/Next is
// a same-segment searchParams navigation — the client component instance
// survives and its useState(initialNotifications) never picks up new props.
// The fix is a `key={page}` on the RSC call site (page.tsx), forcing a
// remount per page. This test documents the remount CONTRACT: a keyed
// re-render picks up new rows; a plain re-render (no key change) — the
// regression trap — keeps the stale ones.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationsPageClient } from "./notifications-page-client";
import type { Notification } from "@/lib/db/schema/notifications";

vi.mock("@/app/actions/notifications", () => ({
  markAllNotificationsReadAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/notifications/notification-sync", () => ({
  broadcastNotificationsRead: vi.fn(),
  NOTIFICATIONS_READ_EVENT: "notifications-read",
}));

function makeRow(id: string, body: string): Notification {
  return {
    id,
    userId: "u1",
    groupId: null,
    type: "expense_added",
    title: "Title",
    body,
    url: "/groups",
    dedupKey: null,
    readAt: null,
    createdAt: new Date(),
  } as unknown as Notification;
}

describe("NotificationsPageClient — remount contract for page navigation", () => {
  it("shows page 1's rows initially", () => {
    render(
      <NotificationsPageClient
        initialNotifications={[makeRow("1", "Page 1 row")]}
        page={1}
        hasNext={true}
        totalUnread={0}
      />,
    );
    expect(screen.getByText("Page 1 row")).toBeInTheDocument();
  });

  it("shows new rows when remounted with a new key (the actual page.tsx contract)", () => {
    const { unmount } = render(
      <div key={1}>
        <NotificationsPageClient
          initialNotifications={[makeRow("1", "Page 1 row")]}
          page={1}
          hasNext={true}
          totalUnread={0}
        />
      </div>,
    );
    expect(screen.getByText("Page 1 row")).toBeInTheDocument();
    unmount();

    render(
      <div key={2}>
        <NotificationsPageClient
          initialNotifications={[makeRow("2", "Page 2 row")]}
          page={2}
          hasNext={false}
          totalUnread={0}
        />
      </div>,
    );
    expect(screen.getByText("Page 2 row")).toBeInTheDocument();
    expect(screen.queryByText("Page 1 row")).not.toBeInTheDocument();
  });

  it("REGRESSION TRAP: a plain re-render without a key change keeps the stale rows", () => {
    const { rerender } = render(
      <NotificationsPageClient
        initialNotifications={[makeRow("1", "Page 1 row")]}
        page={1}
        hasNext={true}
        totalUnread={0}
      />,
    );
    expect(screen.getByText("Page 1 row")).toBeInTheDocument();

    // Same component instance (no key), new props — mirrors what happened
    // before the fix: the instance survives, useState keeps its initial value.
    rerender(
      <NotificationsPageClient
        initialNotifications={[makeRow("2", "Page 2 row")]}
        page={2}
        hasNext={false}
        totalUnread={0}
      />,
    );

    expect(screen.getByText("Page 1 row")).toBeInTheDocument(); // stale — the bug
    expect(screen.queryByText("Page 2 row")).not.toBeInTheDocument();
  });
});

describe("NotificationsPageClient — Round 16 fix #18: page-header Mark all read", () => {
  it("shows the header button when totalUnread > 0, even if this page's rows are all read", () => {
    const readRow = { ...makeRow("1", "Read row"), readAt: new Date() } as Notification;
    render(
      <NotificationsPageClient
        initialNotifications={[readRow]}
        page={1}
        hasNext={false}
        totalUnread={3}
      />,
    );
    expect(screen.getByRole("button", { name: /mark all read/i })).toBeInTheDocument();
  });

  it("hides the header button when totalUnread is 0", () => {
    const readRow = { ...makeRow("1", "Read row"), readAt: new Date() } as Notification;
    render(
      <NotificationsPageClient
        initialNotifications={[readRow]}
        page={1}
        hasNext={false}
        totalUnread={0}
      />,
    );
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
  });
});
