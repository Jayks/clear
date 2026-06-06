// Mapbox geocoding — server-side reverse + client-side forward.
// ⚠️  Do NOT use Nominatim — it's non-commercial; Clear charges for Plus.
// ⚠️  No country=in in any URL — Clear is international.

const MAPBOX_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

// ── URL builders — exported for unit testing ──────────────────────────────────

export function buildReverseGeocodeUrl(lat: number, lng: number, token: string): string {
  return `${MAPBOX_BASE}/${lng},${lat}.json?types=poi,address&limit=1&access_token=${token}`;
}

export function buildForwardGeocodeUrl(query: string, token: string): string {
  return `${MAPBOX_BASE}/${encodeURIComponent(query)}.json?language=en&limit=5&access_token=${token}`;
}

// ── reverseGeocode — server-side, called from parse-receipt.ts ───────────────
// Converts GPS coords from EXIF into a human-readable place name.
// Called concurrently with the AI vision call — must not throw.
// next: { revalidate: 86400 } — same coords yield the same result, cache 24h.

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ name: string; address: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(buildReverseGeocodeUrl(lat, lng, token), {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{ text?: string; place_name?: string }>;
    };
    const feature = data?.features?.[0];
    if (!feature) return null;

    const name    = feature.text ?? feature.place_name?.split(",")[0] ?? "";
    const address = feature.place_name ?? "";
    return name ? { name, address } : null;
  } catch {
    return null; // non-fatal — receipt scanning works without location
  }
}

// ── forwardGeocode — client-side, used by LocationInput ──────────────────────
// Converts a text query into a list of candidate locations.
// AbortController signal cancels stale requests on rapid keystrokes.

export async function forwardGeocode(
  query: string,
  signal?: AbortSignal,
): Promise<Array<{ name: string; address: string; lat: number; lng: number }>> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !query.trim()) return [];

  try {
    const res = await fetch(buildForwardGeocodeUrl(query, token), { signal });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      features?: Array<{ text?: string; place_name?: string; center?: number[] }>;
    };

    return (data?.features ?? []).map((f) => ({
      name:    f.text ?? f.place_name?.split(",")[0] ?? "",
      address: f.place_name ?? "",
      lat:     f.center?.[1] ?? 0,
      lng:     f.center?.[0] ?? 0,
    }));
  } catch (err) {
    // Return [] on AbortError (user typed faster) and any network error
    if (err instanceof Error && err.name === "AbortError") return [];
    return [];
  }
}
