"use client";

import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import { getTripPhotoUploadUrl, createTripPhoto } from "@/app/actions/trip-photos";
import { createClient } from "@/lib/supabase/client";
import { hapticLight } from "@/lib/haptics";

interface TripMemoriesUploadProps {
  groupId: string;
  /** Called after a photo is successfully saved (with the new photo's public URL). */
  onUploaded: (publicUrl: string) => void;
}

interface OptimisticPhoto {
  tempId: string;
  previewUrl: string;
  progress: "uploading" | "error";
}

/**
 * A "+ Add" button that handles the full upload flow with an optimistic thumbnail.
 * Compress → get signed URL → upload via Supabase client → write DB row.
 */
export function TripMemoriesUpload({ groupId, onUploaded }: TripMemoriesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [optimistic, setOptimistic] = useState<OptimisticPhoto | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Step 1 — show optimistic thumbnail immediately
    const previewUrl = URL.createObjectURL(file);
    const tempId = crypto.randomUUID();
    setOptimistic({ tempId, previewUrl, progress: "uploading" });

    try {
      // Step 2 — compress
      const compressed = await compressImage(file);

      // Step 3 — get signed upload URL
      const urlResult = await getTripPhotoUploadUrl(groupId, compressed.type || file.type);
      if (!urlResult.ok) throw new Error(urlResult.error);

      // Step 4 — upload to Supabase Storage directly from the client
      const supabase = createClient();
      const { error: storageError } = await supabase.storage
        .from("trip-photos")
        .uploadToSignedUrl(urlResult.path, urlResult.token, compressed, {
          contentType: compressed.type || "image/jpeg",
        });
      if (storageError) throw new Error(storageError.message);

      // Step 5 — write DB row
      const createResult = await createTripPhoto(groupId, urlResult.path, urlResult.publicUrl);
      if (!createResult.ok) throw new Error(createResult.error);

      hapticLight();
      toast.success("Photo added");
      setOptimistic(null);
      URL.revokeObjectURL(previewUrl);
      onUploaded(urlResult.publicUrl);
    } catch (err) {
      console.error("[TripMemoriesUpload]", err);
      toast.error((err as Error).message ?? "Upload failed — try again");
      setOptimistic((prev) =>
        prev?.tempId === tempId ? { ...prev, progress: "error" } : prev
      );
      // Auto-clear the error thumbnail after 2 s
      setTimeout(() => {
        setOptimistic((prev) => {
          if (prev?.tempId === tempId) { URL.revokeObjectURL(previewUrl); return null; }
          return prev;
        });
      }, 2000);
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {/* Optimistic thumbnail */}
      {optimistic && (
        <div className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={optimistic.previewUrl}
            alt="Uploading…"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
          />
          {/* Progress overlay */}
          <div className={`absolute inset-0 flex items-center justify-center ${optimistic.progress === "error" ? "bg-red-900/60" : "bg-black/40"}`}>
            {optimistic.progress === "uploading" ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <span className="text-white text-xs font-medium">Error</span>
            )}
          </div>
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!!optimistic}
        aria-label="Add photo"
        className="aspect-square rounded-lg border-2 border-dashed border-rose-300 dark:border-rose-700/60 flex flex-col items-center justify-center gap-0.5 text-rose-400 dark:text-rose-500 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[10px] font-medium">Add</span>
      </button>
    </>
  );
}
