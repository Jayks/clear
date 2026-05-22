"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "cover-photos";
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Generates a Supabase Storage signed upload URL.
 * The client uses this to PUT the raw file directly to Supabase,
 * bypassing Vercel's 4.5 MB serverless body limit entirely.
 */
export async function getSignedUploadUrl(input: {
  mimeType: string;
  fileName: string;
}): Promise<
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!ALLOWED_MIME.has(input.mimeType))
    return { ok: false, error: "Only JPEG, PNG, WebP, GIF, and AVIF are supported." };

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
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[getSignedUploadUrl]", error);
    return { ok: false, error: "Could not prepare upload. Please try again." };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, path, token: data.token, publicUrl: urlData.publicUrl };
}
