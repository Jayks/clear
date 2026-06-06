"use client";

// Browser-only image utilities for the receipt scanner.
// ⚠️  extractGpsFromImage MUST be called on the ORIGINAL file BEFORE compressImage —
//     canvas strips EXIF data, so GPS is lost after compression.

// ── compressImage ─────────────────────────────────────────────────────────────
// Resizes to max 800px wide, encodes as 80% JPEG.
// Re-compresses at 65% if still >150 KB (very detailed receipts).
// Returns a new File (same name, type: image/jpeg).

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxWidth = 800;
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }

          if (blob.size > 150 * 1024) {
            // Still over 150 KB — re-compress at 65%
            canvas.toBlob(
              (blob2) => {
                if (!blob2) { reject(new Error("Re-compression failed")); return; }
                resolve(new File([blob2], file.name, { type: "image/jpeg" }));
              },
              "image/jpeg",
              0.65,
            );
          } else {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          }
        },
        "image/jpeg",
        0.8,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ── fileToBase64 ──────────────────────────────────────────────────────────────
// Converts a File to a base64 data URL string for the server action.

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

// ── extractGpsFromImage ───────────────────────────────────────────────────────
// Extracts GPS coordinates from EXIF metadata.
// Only ~30–50% of gallery photos include GPS; camera snapshots never do.
// Returns null silently on any error — non-fatal.
//
// ⚠️  ALWAYS call on the ORIGINAL file before compressImage — canvas strips EXIF.

export async function extractGpsFromImage(
  file: File,
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Dynamic import of the lite build — avoids bundling the full exifr parser
    // Handle both CommonJS (.default) and ESM export shapes.
    const mod = await import("exifr/dist/lite.esm.js");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exifr = (mod as any).default ?? mod;
    const result = await exifr.gps(file).catch(() => null);
    if (!result) return null;
    return { lat: result.latitude, lng: result.longitude };
  } catch {
    return null;
  }
}
