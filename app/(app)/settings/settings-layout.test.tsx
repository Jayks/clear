// Round 16 fix #15: the tab-active state was seeded from ?tab= only once, in
// useState's initializer — typing /settings?tab=notifications into the URL
// bar from an already-mounted instance never picked it up. An effect keyed
// on the `tab` search param now re-syncs `active` whenever it changes.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsLayout } from "./settings-layout";

vi.mock("./billing-section", () => ({ BillingSection: () => <div>Billing content</div> }));
vi.mock("./notifications-section", () => ({ NotificationsSection: () => <div>Notifications content</div> }));
vi.mock("./profile-section", () => ({ ProfileSection: () => <div>Profile content</div> }));
vi.mock("@/components/shared/theme-toggle", () => ({ ThemeToggle: () => <div>Theme toggle</div> }));

let mockTabParam: string | null = null;
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === "tab" ? mockTabParam : null) }),
}));

const baseProps = {
  sub: null,
  currentDisplayName: "Test User",
  userEmail: "test@example.com",
  userAvatarUrl: null,
  upiIds: [],
  initialEmailEnabled: false,
};

describe("SettingsLayout — deep-link tab param (Round 16 fix #15)", () => {
  it("shows the section named by ?tab= at mount", () => {
    mockTabParam = "notifications";
    const { container } = render(<SettingsLayout {...baseProps} />);
    // The active section's wrapper has no `md:hidden` class; assert via the
    // sidebar's active-state styling instead, which is the most direct
    // signal of `active` without depending on desktop-only CSS visibility.
    const notificationsButton = screen.getByRole("button", { name: /notifications/i });
    expect(notificationsButton.className).toContain("bg-white/80");
    void container;
  });

  it("re-syncs `active` when the tab param changes on an already-mounted instance", () => {
    mockTabParam = "profile";
    const { rerender } = render(<SettingsLayout {...baseProps} />);
    expect(screen.getByRole("button", { name: /^profile$/i }).className).toContain("bg-white/80");

    // Simulate landing on /settings?tab=billing from another already-mounted
    // page (the exact regression this fix addresses) — same component
    // instance, new searchParams value.
    mockTabParam = "billing";
    rerender(<SettingsLayout {...baseProps} />);

    expect(screen.getByRole("button", { name: /billing/i }).className).toContain("bg-white/80");
    expect(screen.getByRole("button", { name: /^profile$/i }).className).not.toContain("bg-white/80");
  });

  it("clicking a sidebar tab still calls router.replace with the new tab", () => {
    mockTabParam = "profile";
    render(<SettingsLayout {...baseProps} />);
    screen.getByRole("button", { name: /billing/i }).click();
    expect(replaceMock).toHaveBeenCalledWith("/settings?tab=billing", { scroll: false });
  });
});
