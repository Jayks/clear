import type { MetadataRoute } from "next";

// Same fallback pattern as app/layout.tsx's metadataBase — see CLAUDE.md env vars.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clearoff.in";

/**
 * Only the public marketing/legal pages (see app/sitemap.ts) are worth crawling.
 * Everything else is either auth-gated (proxy.ts redirects unauthenticated
 * visitors away anyway) or carries a per-user/per-guest token in the URL
 * (/join, /request, /summary, /stream/confirm, /pay) that must never end up
 * indexed or followed by a crawler.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/groups",
        "/insights",
        "/settings",
        "/admin",
        "/upgrade",
        "/dev",
        "/stream",
        "/api",
        "/auth",
        "/login",
        "/join",
        "/pay",
        "/request",
        "/summary",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
