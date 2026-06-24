import type { MetadataRoute } from "next";

// Same fallback pattern as app/layout.tsx's metadataBase — see CLAUDE.md env vars.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clearoff.in";

/**
 * Public, stable marketing/legal pages only. Everything behind auth (/groups,
 * /insights, /settings, /admin, /stream) and every token-bearing page
 * (/join/[token], /request/[token], /summary/[token], /stream/confirm/[token],
 * /pay) is intentionally excluded — see app/robots.ts for the matching disallow
 * list. Those pages have no stable canonical URL worth indexing and some carry
 * sensitive tokens that shouldn't be crawled at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
