"use server";

import { db } from "@/lib/db/client";
import { tripPhotos } from "@/lib/db/schema/trip-photos";
import { groups } from "@/lib/db/schema/groups";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUploadTripMemories } from "@/lib/subscription/gates";
import { getTripPhotoCount } from "@/lib/db/queries/trip-photos";
import { isValidStoragePath } from "@/lib/trip-photos/storage-path";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const BUCKET = "trip-photos";
const PHOTO_CAP = 30;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Returns a signed upload URL for uploading a trip photo directly to Supabase Storage.
 * Gated behind Plus membership, group membership, and trips-only (not nests or circles).
 */
export async function getTripPhotoUploadUrl(
  groupId: string,
  mimeType: string
): Promise<
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" };

  // FIX #2: Trip Memories is trips-only — block nests and circles
  const [group] = await db.select({ groupType: groups.groupType }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group || group.groupType !== "trip")
    return { ok: false, error: "Trip Memories is only available for trips." };

  if (!(await canUploadTripMemories(user.id)))
    return { ok: false, error: "Trip Memories requires Clear Plus." };

  if (!ALLOWED_MIME.has(mimeType))
    return { ok: false, error: "Only JPEG, PNG, and WebP images are supported." };

  // Check cap before generating a signed URL — avoids wasted tokens
  const count = await getTripPhotoCount(groupId);
  if (count >= PHOTO_CAP)
    return { ok: false, error: `Photo limit reached (${PHOTO_CAP} photos per trip).` };

  const photoId = crypto.randomUUID();
  const ext = mimeType.split("/")[1] ?? "jpg";
  const path = `${groupId}/${photoId}.${ext}`;

  // Use admin client to generate the signed upload URL — trip-photos bucket
  // has no per-user INSERT storage policy; all auth/Plus/cap checks already
  // passed above, so using service role here is safe.
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[getTripPhotoUploadUrl]", error);
    return { ok: false, error: "Could not prepare upload. Please try again." };
  }

  const { data: urlData } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, path, token: data.token, publicUrl: urlData.publicUrl };
}

/**
 * Inserts a trip_photos row after the client has completed the signed upload.
 * Re-checks membership, Plus gate, group type, and the 30-photo cap (atomically).
 */
export async function createTripPhoto(
  groupId: string,
  storagePath: string,
  publicUrl: string,
  caption?: string
): Promise<{ ok: true; photoId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" };

  // FIX #2: Trip Memories is trips-only
  const [group] = await db.select({ groupType: groups.groupType }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group || group.groupType !== "trip")
    return { ok: false, error: "Trip Memories is only available for trips." };

  if (!(await canUploadTripMemories(user.id)))
    return { ok: false, error: "Trip Memories requires Clear Plus." };

  // FIX #1: Validate storagePath belongs to this group — prevents cross-group storage injection
  if (!isValidStoragePath(storagePath, groupId))
    return { ok: false, error: "Invalid photo path." };

  try {
    // FIX #13: Enforce the photo cap atomically inside a transaction to prevent
    // concurrent uploads from both passing the count check and exceeding the cap.
    const photo = await db.transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(tripPhotos)
        .where(eq(tripPhotos.groupId, groupId));

      if (count >= PHOTO_CAP)
        throw new Error(`Photo limit reached (${PHOTO_CAP} photos per trip).`);

      const [inserted] = await tx
        .insert(tripPhotos)
        .values({
          groupId,
          memberId: membership.id,
          storagePath,
          publicUrl,
          caption: caption?.trim() || null,
          displayOrder: count, // append after existing photos
        })
        .returning();

      return inserted;
    });

    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true, photoId: photo.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("Photo limit reached")) return { ok: false, error: msg };
    return { ok: false, error: "Failed to save photo." };
  }
}

/**
 * Deletes a trip photo. Allowed by: the uploader OR an admin.
 * No Plus check — members should always be able to remove content.
 */
export async function deleteTripPhoto(
  photoId: string,
  groupId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" };

  // Fetch the photo to check ownership
  const [photo] = await db
    .select()
    .from(tripPhotos)
    .where(and(eq(tripPhotos.id, photoId), eq(tripPhotos.groupId, groupId)))
    .limit(1);

  if (!photo) return { ok: false, error: "Photo not found" };

  const isUploader = photo.memberId === membership.id;
  const isAdmin = membership.role === "admin";
  if (!isUploader && !isAdmin) return { ok: false, error: "Not authorized" };

  try {
    // Delete from storage first — if this fails we don't orphan the DB row.
    // BUGFIX (audit): Supabase Storage's .remove() *resolves* to { data, error } —
    // it does not throw on failure, so the old code always fell through to the
    // DB delete regardless of whether the storage delete actually succeeded.
    // A failed/stale storagePath silently orphaned the file in the bucket (no
    // cron sweeps this bucket, unlike receipt-photos). Explicitly check `error`.
    const adminSupabase = createAdminClient();
    const { error: storageError } = await adminSupabase.storage.from(BUCKET).remove([photo.storagePath]);
    if (storageError) {
      console.error("[deleteTripPhoto] storage remove failed:", storageError);
      return { ok: false, error: "Failed to delete photo." };
    }

    await db.delete(tripPhotos).where(eq(tripPhotos.id, photoId));
    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to delete photo." };
  }
}

/**
 * Updates a photo's caption. Only the uploader may edit their own caption.
 * No Plus check.
 */
export async function updatePhotoCaption(
  photoId: string,
  groupId: string,
  caption: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" };

  const [photo] = await db
    .select({ memberId: tripPhotos.memberId })
    .from(tripPhotos)
    .where(and(eq(tripPhotos.id, photoId), eq(tripPhotos.groupId, groupId)))
    .limit(1);

  if (!photo) return { ok: false, error: "Photo not found" };
  if (photo.memberId !== membership.id) return { ok: false, error: "Not authorized" };

  try {
    await db
      .update(tripPhotos)
      .set({ caption: caption.trim() || null })
      .where(eq(tripPhotos.id, photoId));

    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update caption." };
  }
}
