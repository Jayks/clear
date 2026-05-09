import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { trips } from "@/lib/db/schema/trips";
import { createClient } from "@/lib/supabase/server";
import { eq, desc, and } from "drizzle-orm";
import { getCategory } from "@/lib/categories";

function escapeCSV(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Verify membership
  const [member] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, id), eq(tripMembers.userId, user.id)));
  if (!member) return new Response("Forbidden", { status: 403 });

  const [trip] = await db.select().from(trips).where(eq(trips.id, id));
  if (!trip) return new Response("Not found", { status: 404 });

  const rows = await db
    .select({
      expenseDate: expenses.expenseDate,
      description: expenses.description,
      category: expenses.category,
      amount: expenses.amount,
      currency: expenses.currency,
      displayName: tripMembers.displayName,
      guestName: tripMembers.guestName,
      notes: expenses.notes,
    })
    .from(expenses)
    .leftJoin(tripMembers, eq(expenses.paidByMemberId, tripMembers.id))
    .where(eq(expenses.tripId, id))
    .orderBy(desc(expenses.expenseDate));

  const header = ["Date", "Description", "Category", "Amount", "Currency", "Paid By", "Notes"];
  const lines = [
    header.join(","),
    ...rows.map((r) => {
      const payerName = r.displayName ?? r.guestName ?? "Unknown";
      const categoryLabel = getCategory(r.category).label;
      return [
        escapeCSV(r.expenseDate),
        escapeCSV(r.description),
        escapeCSV(categoryLabel),
        escapeCSV(r.amount),
        escapeCSV(r.currency),
        escapeCSV(payerName),
        escapeCSV(r.notes),
      ].join(",");
    }),
  ];

  const csv = lines.join("\n");
  const filename = `${trip.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-expenses.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
