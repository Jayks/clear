import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { circleContributions } from "@/lib/db/schema/circle-contributions";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Seeds a sample recurring Circle so the demo showcases all three contexts
 * (trip + nest + circle). Recurring mode is the most illustrative — it shows the
 * cycle nav, wallet balance, runway, and a roster with some paid / some pending.
 * The current user is the admin; the rest are ghost members.
 */
export async function seedDemoCircle(userId: string, displayName: string | null) {
  const period = currentPeriod();

  // ── 1. Group ──────────────────────────────────────────────────────────────
  const [group] = await db.insert(groups).values({
    name: "Office Coffee Pool · Sample",
    description: "A pre-loaded sample circle — explore shared contributions freely!",
    groupType: "circle",
    defaultCurrency: "INR",
    circleMode: "recurring",
    contributionAmount: "500",
    contributionPeriod: "monthly",
    contributionDay: 5,
    circleStatus: "active",
    upiId: "sample@okaxis",
    walletExpensesEnabled: true,
    createdBy: userId,
    isDemo: true,
  }).returning();

  // ── 2. Members — user (admin) + 4 ghosts ──────────────────────────────────
  const [admin, arjun, meera, dev, priya] = await db.insert(groupMembers).values([
    { groupId: group.id, userId, displayName, role: "admin" },
    { groupId: group.id, guestName: "Arjun Rao",  role: "member" },
    { groupId: group.id, guestName: "Meera Pillai", role: "member" },
    { groupId: group.id, guestName: "Dev Menon",  role: "member" },   // pending
    { groupId: group.id, guestName: "Priya Das",  role: "member" },   // pending
  ]).returning();

  // ── 3. Contributions — 3/5 paid this cycle (admin + Arjun + Meera) ────────
  await db.insert(circleContributions).values([
    { groupId: group.id, memberId: admin.id, amount: "500", currency: "INR", period, recordedBy: userId },
    { groupId: group.id, memberId: arjun.id, amount: "500", currency: "INR", period, recordedBy: userId },
    { groupId: group.id, memberId: meera.id, amount: "500", currency: "INR", period, recordedBy: userId },
  ]);
  // Dev + Priya remain pending so the roster shows the pending state + remind bell.
  void dev; void priya;

  // ── 4. One wallet expense so the wallet balance reads non-zero ────────────
  await db.insert(expenses).values({
    groupId: group.id,
    paidByMemberId: admin.id,
    description: "Coffee beans & filters",
    category: "supplies",
    amount: "800",
    currency: "INR",
    expenseDate: `${period}-08`,
    isTemplate: false,
    createdByUserId: userId,
  });

  return group;
}
