/**
 * Derives a human-readable label from a photo album URL.
 * E.g. "https://photos.google.com/..." → "Google Photos"
 *
 * Pure function — safe to test and use in RSC without any browser APIs.
 */
export function getAlbumHostLabel(url: string): string {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes("google")) return "Google Photos";
    if (hostname.includes("icloud")) return "iCloud Photos";
    if (hostname.includes("flickr")) return "Flickr";
    if (hostname.includes("amazon")) return "Amazon Photos";
    return hostname.replace(/^www\./, "");
  } catch {
    return "Photo album";
  }
}

/** Returns true when the group has reached the 30-photo upload cap. */
export function isAtPhotoCap(count: number): boolean {
  return count >= 30;
}
