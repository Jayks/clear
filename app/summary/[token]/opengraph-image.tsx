import { ImageResponse } from "next/og";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { eq, sql } from "drizzle-orm";
import { differenceInDays, parseISO } from "date-fns";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [trip] = await db.select().from(groups).where(eq(groups.shareToken, token));
  if (!trip) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: "#0891B2", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 32 }}>
        Clear
      </div>,
      size
    );
  }

  const [[totalRow], memberRows] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(amount)::float8, 0)` }).from(expenses).where(eq(expenses.groupId, trip.id)),
    db.select({ id: groupMembers.id }).from(groupMembers).where(eq(groupMembers.groupId, trip.id)),
  ]);

  const totalSpend = totalRow?.total ?? 0;
  const memberCount = memberRows.length;
  const perPerson = memberCount > 0 ? totalSpend / memberCount : 0;
  const currency = trip.defaultCurrency;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  let dateRange = "";
  let tripDays = 0;
  if (trip.startDate && trip.endDate) {
    const s = new Date(trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const e = new Date(trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    dateRange = `${s} – ${e}`;
    tripDays = Math.max(1, differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1);
  } else if (trip.startDate) {
    dateRange = new Date(trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const nameFontSize = trip.name.length > 35 ? 52 : trip.name.length > 22 ? 62 : 72;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0C4A6E 0%, #0891B2 50%, #0D9488 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "56px 72px",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: "absolute", top: -140, right: -140,
        width: 500, height: 500, borderRadius: "50%",
        background: "rgba(255,255,255,0.07)", display: "flex",
      }} />
      <div style={{
        position: "absolute", bottom: -100, left: -80,
        width: 360, height: 360, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)", display: "flex",
      }} />

      {/* Logo row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "auto" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "white",
        }}>
          W
        </div>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 24, fontWeight: 600 }}>Clear</span>
      </div>

      {/* Trip name + date */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48 }}>
        <div style={{ color: "white", fontSize: nameFontSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>
          {trip.name}
        </div>
        {(dateRange || tripDays > 0) && (
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 26 }}>
            {dateRange}{tripDays > 0 ? ` · ${tripDays} days` : ""}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 48, marginBottom: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ color: "white", fontSize: 46, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {fmt(totalSpend)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>Total spent</div>
        </div>

        <div style={{ width: 1, height: 64, background: "rgba(255,255,255,0.18)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ color: "white", fontSize: 46, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {memberCount}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>
            {memberCount === 1 ? "person" : "people"}
          </div>
        </div>

        {totalSpend > 0 && memberCount > 1 && (
          <>
            <div style={{ width: 1, height: 64, background: "rgba(255,255,255,0.18)", display: "flex" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: "white", fontSize: 46, fontWeight: 800, letterSpacing: "-0.5px" }}>
                {fmt(perPerson)}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>Per person</div>
            </div>
          </>
        )}
      </div>

      {/* Tagline */}
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 17, letterSpacing: "0.3px" }}>
        Travel together. Settle easy.
      </div>
    </div>,
    { ...size }
  );
}
