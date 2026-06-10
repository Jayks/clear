/**
 * app/pay/opengraph-image.tsx
 *
 * Next.js special OG image file — auto-served at /pay/opengraph-image.
 * Receives the same searchParams as the /pay page.
 * Uses the same nodejs runtime as app/summary/[token]/opengraph-image.tsx.
 *
 * Characters: ASCII only — next/og cannot download fallback fonts in dev,
 * so non-Latin chars (₹, ✓) cause "failed to pipe response".
 */

import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  searchParams,
}: {
  // opengraph-image files receive searchParams as a plain object (not a Promise).
  // In Turbopack dev, searchParams may not be passed for static routes — default to {}.
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp       = searchParams ?? {};
  const amount   = sp.am  ? Number(sp.am as string)  : 0;
  const currency = (sp.cu as string | undefined) ?? "INR";
  const context  = (sp.tn as string | undefined) ?? "";
  const toUserId = sp.to  as string | undefined;

  // Fetch payee name — OG scrapers hit this URL separately, so we look it up here.
  let payee = "Someone";
  if (toUserId) {
    try {
      const { data } = await createAdminClient().auth.admin.getUserById(toUserId);
      payee = (data.user?.user_metadata?.full_name as string | undefined) ?? payee;
    } catch { /* fall back */ }
  }

  // ASCII-safe currency label (next/og cannot render Rs symbol without font download)
  const sym             = currency === "INR" ? "Rs." : currency;
  const formattedAmount = amount.toLocaleString("en-US"); // en-US = no ICU issues

  return new ImageResponse(
    (
      <div
        style={{
          width:         "100%",
          height:        "100%",
          background:    "linear-gradient(135deg, #0C4A6E 0%, #0891B2 55%, #0D9488 100%)",
          display:       "flex",
          flexDirection: "column",
          padding:       "56px 72px",
          fontFamily:    "sans-serif",
          position:      "relative",
          overflow:      "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -160, right: -160, width: 540, height: 540, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -120, left: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={38} height={38} viewBox="0 0 100 100">
              <path d="M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="miter" strokeOpacity="0.97" />
              <path d="M96 37 Q88 44 80 49" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
              <path d="M96 63 Q88 56 80 51" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
              <path d="M76.2 41 A9 9 0 0 0 76.2 59 Z" fill="white" />
              <path d="M77.8 41 A9 9 0 0 1 77.8 59 Z" fill="white" fillOpacity="0.8" />
            </svg>
          </div>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 26, fontWeight: 600 }}>Clear</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Amount */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          <div style={{ color: "white", fontSize: 88, fontWeight: 800, lineHeight: 1, letterSpacing: "-3px" }}>
            {`${sym} ${formattedAmount}`}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 30, fontWeight: 500 }}>
            payment request
          </div>
        </div>

        {/* Payee + context */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>
              {payee.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 28, fontWeight: 600 }}>
              {payee}
            </span>
          </div>
          {context ? (
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 22, paddingLeft: 52 }}>
              {`for ${context}`}
            </div>
          ) : null}
        </div>

        {/* Tagline */}
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 17, letterSpacing: "0.4px" }}>
          Pay via UPI - Powered by Clear
        </div>
      </div>
    ),
    { ...size }
  );
}
