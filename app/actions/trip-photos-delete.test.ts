// Integration test against the REAL dev database for the DB portion (group,
// member, trip_photos row) — only the Supabase Storage call is mocked, since
// that's the genuinely external service. Verifies the audit fix: a failed
// storage.remove() must NOT delete the trip_photos DB row (which would orphan
// the file in the bucket forever — no cron sweeps trip-photos).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

const removeMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: TEST_USER_ID, user_metadata: {} }) as never),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        remove: removeMock,
      }),
    },
  }),
}));

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { tripPhotos } = await import("@/lib/db/schema/trip-photos");
const { deleteTripPhoto } = await import("@/app/actions/trip-photos");
const { eq } = await import("drizzle-orm");

describe("deleteTripPhoto — storage error must not orphan-delete the DB row", () => {
  let groupId: string;
  let memberId: string;
  let photoId: string;

  beforeAll(async () => {
    const [group] = await db
      .insert(groups)
      .values({ name: "Photo Delete Test Trip (auto-cleaned)", groupType: "trip", createdBy: TEST_USER_ID })
      .returning({ id: groups.id });
    groupId = group.id;

    const [member] = await db
      .insert(groupMembers)
      .values({ groupId, userId: TEST_USER_ID, displayName: "Tester", role: "admin" })
      .returning({ id: groupMembers.id });
    memberId = member.id;
  });

  afterAll(async () => {
    if (groupId) await db.delete(groups).where(eq(groups.id, groupId)); // cascades
  });

  it("keeps the DB row when storage.remove() returns an error", async () => {
    const [photo] = await db
      .insert(tripPhotos)
      .values({
        groupId,
        memberId,
        storagePath: `${groupId}/test-photo.jpg`,
        publicUrl: "https://example.com/test-photo.jpg",
      })
      .returning({ id: tripPhotos.id });
    photoId = photo.id;

    removeMock.mockResolvedValueOnce({ data: null, error: { message: "simulated storage failure" } });

    const result = await deleteTripPhoto(photoId, groupId);

    expect(result.ok).toBe(false);

    const [stillThere] = await db.select().from(tripPhotos).where(eq(tripPhotos.id, photoId));
    expect(stillThere).toBeDefined(); // row must survive a failed storage delete
  });

  it("deletes the DB row when storage.remove() succeeds", async () => {
    const [photo] = await db
      .insert(tripPhotos)
      .values({
        groupId,
        memberId,
        storagePath: `${groupId}/test-photo-2.jpg`,
        publicUrl: "https://example.com/test-photo-2.jpg",
      })
      .returning({ id: tripPhotos.id });
    photoId = photo.id;

    removeMock.mockResolvedValueOnce({ data: [{ name: "test-photo-2.jpg" }], error: null });

    const result = await deleteTripPhoto(photoId, groupId);

    expect(result.ok).toBe(true);

    const [gone] = await db.select().from(tripPhotos).where(eq(tripPhotos.id, photoId));
    expect(gone).toBeUndefined();
  });
});
