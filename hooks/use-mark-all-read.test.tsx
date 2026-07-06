// Round 16 fix #11: all three notification surfaces (desktop bell, mobile
// bell, /notifications page) used to `.catch(() => {})` a failed
// markAllNotificationsReadAction and broadcast "read" anyway — a failure
// (e.g. offline) still visually cleared every badge/list even though
// nothing was marked read server-side. The shared useMarkAllRead() hook now
// only broadcasts on {ok:true}; on failure it toasts and leaves state alone.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMarkAllRead } from "./use-notification-read-sync";

const markAllMock = vi.fn();
vi.mock("@/app/actions/notifications", () => ({
  markAllNotificationsReadAction: (...args: unknown[]) => markAllMock(...args),
}));

const broadcastMock = vi.fn();
vi.mock("@/lib/notifications/notification-sync", () => ({
  broadcastNotificationsRead: (...args: unknown[]) => broadcastMock(...args),
  NOTIFICATIONS_READ_EVENT: "notifications-read",
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}));

describe("useMarkAllRead", () => {
  beforeEach(() => {
    markAllMock.mockReset();
    broadcastMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("broadcasts the read event when the action succeeds", async () => {
    markAllMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkAllRead());

    await act(async () => {
      await result.current.handleMarkAllRead();
    });

    expect(broadcastMock).toHaveBeenCalledWith({ scope: "all" });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("does NOT broadcast and shows a toast when the action returns {ok:false}", async () => {
    markAllMock.mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useMarkAllRead());

    await act(async () => {
      await result.current.handleMarkAllRead();
    });

    expect(broadcastMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Couldn't mark notifications read");
  });

  it("does NOT broadcast and shows a toast when the action throws (e.g. offline)", async () => {
    markAllMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useMarkAllRead());

    await act(async () => {
      await result.current.handleMarkAllRead();
    });

    expect(broadcastMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Couldn't mark notifications read");
  });

  it("resets `marking` back to false after either outcome", async () => {
    markAllMock.mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useMarkAllRead());

    await act(async () => {
      await result.current.handleMarkAllRead();
    });

    await waitFor(() => expect(result.current.marking).toBe(false));
  });
});
