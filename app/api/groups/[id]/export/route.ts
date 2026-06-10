import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { createClient } from "@/lib/supabase/server";
import { eq, desc, and } from "drizzle-orm";
import { getCategory } from "@/lib/categories";
import { canExportCSV } from "@/lib/subscription/gates";

function escapeCSV(value: string | null | undefined): string {
  let s = value ?? "";
  // Neutralise spreadsheet formula injection: cells beginning with = + - @ (or
  // tab/CR) are executed as formulas by Excel/Sheets. Prefix with a single quote
  // — but skip plain numbers (e.g. "-50") so legitimate amounts aren't mangled.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
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

  if (!(await canExportCSV(user.id)))
    return new Response("CSV export requires Clear Plus.", { status: 402 });

  // Verify membership
  const [member] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user.id)));
  if (!member) return new Response("Forbidden", { status: 403 });

  const [trip] = await db.select().from(groups).where(eq(groups.id, id));
  if (!trip) return new Response("Not found", { status: 404 });

  const rows = await db
    .select({
      expenseDate: expenses.expenseDate,
      description: expenses.description,
      category: expenses.category,
      amount: expenses.amount,
      currency: expenses.currency,
      displayName: groupMembers.displayName,
      guestName: groupMembers.guestName,
      notes: expenses.notes,
    })
    .from(expenses)
    .leftJoin(groupMembers, eq(expenses.paidByMemberId, groupMembers.id))
    .where(and(eq(expenses.groupId, id), eq(expenses.isTemplate, false)))
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
