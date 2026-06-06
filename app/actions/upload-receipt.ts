"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "receipt-photos";
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Generates a Supabase Storage signed upload URL for a receipt photo.
 * The client uses this to PUT the raw file directly to Supabase Storage,
 * bypassing Vercel's 4.5 MB serverless body limit entirely.
 *
 * Path: {userId}/{groupId}/{timestamp}-receipt.{ext}
 * Mirror of upload.ts (cover-photos) — same pattern, different bucket + path.
 */
export async function getSignedReceiptUploadUrl(input: {
  mimeType: string;
  groupId:  string;
}): Promise<
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!ALLOWED_MIME.has(input.mimeType))
    return { ok: false, error: "Only JPEG, PNG, and WebP are supported." };

  const ext  = input.mimeType.split("/")[1] ?? "jpg";
  const path = `${user.id}/${input.groupId}/${Date.now()}-receipt.${ext}`;

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[getSignedReceiptUploadUrl]", error);
    return { ok: false, error: "Could not prepare upload. Please try again." };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, path, token: data.token, publicUrl: urlData.publicUrl };
}
