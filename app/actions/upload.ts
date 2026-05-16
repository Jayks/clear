"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "cover-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function uploadCoverPhoto(input: {
  base64: string;
  mimeType: string;
  fileName: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!ALLOWED_MIME.has(input.mimeType))
    return { ok: false, error: "Only JPEG, PNG, WebP, GIF, and AVIF are supported." };

  const buffer = Buffer.from(input.base64, "base64");
  if (buffer.byteLength > MAX_BYTES)
    return { ok: false, error: "Image is too large (max 5 MB)." };

  const ext = input.mimeType.split("/")[1] ?? "jpg";
  const slug =
    input.fileName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cover";
  const path = `${user.id}/${Date.now()}-${slug}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: input.mimeType, upsert: false });

  if (error) {
    console.error("[uploadCoverPhoto]", error);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
