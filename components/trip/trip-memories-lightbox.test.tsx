// Verifies the audit fix: TripMemoriesLightbox now ignores ArrowLeft/ArrowRight
// while a delete is in flight, matching the prev/next BUTTONS (already
// `disabled={deleting}`). Without the fix, pressing an arrow key mid-delete
// changes `index`, and when the delete resolves
// `setIndex(i => Math.min(i, photos.length - 2))` re-clamps against the
// pre-delete photos.length — landing on the wrong photo.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TripMemoriesLightbox } from "./trip-memories-lightbox";
import type { TripPhoto } from "@/lib/db/schema/trip-photos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/haptics", () => ({ hapticDelete: vi.fn() }));

let resolveDelete: (v: { ok: true }) => void;
const deleteTripPhotoMock = vi.fn(
  (..._args: unknown[]) => new Promise<{ ok: true }>((resolve) => { resolveDelete = resolve; })
);
vi.mock("@/app/actions/trip-photos", () => ({
  deleteTripPhoto: (...args: unknown[]) => deleteTripPhotoMock(...args),
  updatePhotoCaption: vi.fn(),
}));

function makePhoto(id: string): TripPhoto {
  return {
    id,
    groupId: "g1",
    memberId: "m1",
    storagePath: `g1/${id}.jpg`,
    publicUrl: `https://example.com/${id}.jpg`,
    caption: null,
    displayOrder: 0,
    createdAt: new Date("2026-01-01"),
  };
}

const photos = [makePhoto("p1"), makePhoto("p2"), makePhoto("p3")];

describe("TripMemoriesLightbox — arrow keys during in-flight delete (audit fix)", () => {
  beforeEach(() => {
    deleteTripPhotoMock.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("ignores ArrowRight/ArrowLeft while a delete is pending, and responds again once it resolves", async () => {
    render(
      <TripMemoriesLightbox
        photos={photos}
        startIndex={0}
        open={true}
        onClose={vi.fn()}
        currentMemberId="m1"
        isAdmin={false}
        groupId="g1"
        memberNames={{ m1: "Tester" }}
      />
    );

    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Kick off a delete that won't resolve until we tell it to.
    const deleteButton = screen.getByLabelText("Delete photo");
    fireEvent.click(deleteButton);
    await waitFor(() => expect(deleteTripPhotoMock).toHaveBeenCalledTimes(1));
    expect(deleteButton).toBeDisabled(); // `deleting` is true

    // While the delete is in flight, arrow keys must be a no-op — this is the
    // audit fix: previously only the buttons (already disabled above) were
    // guarded; the keydown handler had no `deleting` check at all.
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Resolve the delete — `deleting` flips back to false.
    resolveDelete!({ ok: true });
    await waitFor(() => expect(deleteButton).not.toBeDisabled());

    // Arrow keys work again now that deleting is false (moves index 0 → 1;
    // the `photos` prop count itself only changes once the parent re-fetches
    // after router.refresh(), which is outside this component's own state).
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });
});
