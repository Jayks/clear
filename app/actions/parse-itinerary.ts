"use server";

// Import the parser directly to bypass pdf-parse's index.js debug-mode
// check (`isDebugMode = !module.parent`) which fires in Turbopack's server
// bundle where module.parent is undefined, causing a readFileSync crash.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

export async function parseItineraryFromFile(input: {
  base64: string;
  mimeType: "application/pdf" | "text/plain";
  fileName: string;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  // Base64 encodes 3 bytes as 4 chars; ×3/4 estimates the original byte size.
  const byteSize = Math.round((input.base64.length * 3) / 4);
  if (byteSize > 10 * 1024 * 1024)
    return { ok: false, error: "File is too large (max 10 MB)." };

  try {
    let raw: string;

    if (input.mimeType === "text/plain") {
      raw = Buffer.from(input.base64, "base64").toString("utf-8");
    } else {
      const buffer = Buffer.from(input.base64, "base64");
      const result = await pdfParse(buffer);
      raw = result.text;
    }

    const cleaned = raw
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleaned) return { ok: false, error: "No text could be extracted from the file." };
    return { ok: true, text: cleaned.slice(0, 10000) };
  } catch (err) {
    console.error("[parse-itinerary]", err);
    return { ok: false, error: "Failed to read the file. Make sure it is a valid PDF or text file." };
  }
}
