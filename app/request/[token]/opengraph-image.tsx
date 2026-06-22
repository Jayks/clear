/**
 * app/request/[token]/opengraph-image.tsx
 *
 * Next.js special OG image file — auto-served at /request/[token]/opengraph-image.
 * Same pattern as app/pay/opengraph-image.tsx.
 *
 * Characters: ASCII only — next/og cannot download fallback fonts in dev,
 * so non-Latin chars (₹, ✓) cause "failed to pipe response". Use "Rs." instead.
 *
 * Flexi circles (request.amount === null) → "Payment request" with no figure,
 * to avoid rendering "Rs.null payment request".
 */

import { ImageResponse } from "next/og";
import { db } from "@/lib/db/client";
import { paymentRequests } from "@/lib/db/schema/payment-requests";
import { eq } from "drizzle-orm";
import { BRAND } from "@/lib/brand";
import {
  GLYPH_DARK,
  PATH_C,
  INFLOW_1,
  INFLOW_2,
  NODE_CX,
  NODE_CY,
  NODE_R,
  CHECK_PATH,
  buildBevelLayers,
} from "@/lib/brand-glyph";

export const runtime = "nodejs";
export const size    = { width: 1200, height: 630 };
export const contentType = "image/png";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OgImage({
  params,
}: {
  // In Next.js 16, route params are Promises for dynamic opengraph-image files.
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Fetch the payment request for rendering the card
  let row: typeof paymentRequests.$inferSelect | null = null;
  try {
    if (UUID_RE.test(token)) {
      row = await db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.token, token))
        .limit(1)
        .then((r) => r[0] ?? null);
    }
  } catch { /* fall back to generic card */ }

  const amount    = row?.amount !== null && row?.amount !== undefined ? Number(row.amount) : null;
  const currency  = row?.currency ?? "INR";
  const groupName = row?.groupName ?? "Payment request";
  const desc      = row?.description ?? "";
  const payeeName = row?.payeeName ?? "";

  // ASCII-safe currency label
  const sym = currency === "INR" ? "Rs." : currency;

  // Title line: Flexi (amount=null) → "Payment request"; fixed → "Rs.X payment request"
  const titleLine = amount !== null
    ? `${sym}${amount.toLocaleString("en-US")} payment request`
    : "Payment request";

  const firstName = payeeName ? payeeName.split(" ")[0] : null;

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
              {/* B-Converge mark — C + inflow strokes into a node, resolving into a
                  checkmark cut. 3D bevel stack (no halo/highlight at this small
                  inline size — same minimal treatment this logo always had). */}
              {buildBevelLayers().map((l, i) => (
                <g key={i} transform={`translate(${l.dx},${l.dy})`}>
                  <path d={PATH_C} fill="none" stroke={l.color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="miter" strokeOpacity={l.isFront ? 0.97 : 1} />
                  <path d={INFLOW_1} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
                  <path d={INFLOW_2} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
                  <circle cx={NODE_CX} cy={NODE_CY} r={NODE_R} fill={l.color} />
                </g>
              ))}
              <path d={CHECK_PATH} fill="none" stroke={GLYPH_DARK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 26, fontWeight: 600 }}>
            {BRAND.namePrefix}
            <span style={{ color: "#22D3EE" }}>{BRAND.nameAccent}</span>
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Amount / title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          <div style={{ color: "white", fontSize: amount !== null ? 88 : 72, fontWeight: 800, lineHeight: 1, letterSpacing: "-3px" }}>
            {titleLine}
          </div>
        </div>

        {/* Payee + context */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 52 }}>
          {firstName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>
                {firstName.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 28, fontWeight: 600 }}>
                {payeeName}
              </span>
            </div>
          ) : null}
          {desc || groupName ? (
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 22, paddingLeft: firstName ? 52 : 0 }}>
              {desc ? `${desc} · ${groupName}` : groupName}
            </div>
          ) : null}
        </div>

        {/* Tagline */}
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 17, letterSpacing: "0.4px" }}>
          {`Tap to pay via UPI - Powered by ${BRAND.name}`}
        </div>
      </div>
    ),
    { ...size }
  );
}
