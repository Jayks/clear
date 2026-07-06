import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getNotifications } from "@/lib/db/queries/notifications";
import { NotificationsPageClient } from "./notifications-page-client";

export const metadata: Metadata = { title: "Notifications — ClearOff" };

const PAGE_SIZE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

/** Full notification history — reached via the bell's "View all →" footer
 *  link on both platforms. Same client-side-feel Prev/Next, 10-per-page
 *  pagination the rest of the app prefers over infinite scroll
 *  ([[feedback_pagination_pattern]]), implemented here as real DB offset
 *  pagination (not an all-upfront client slice like expense-filters.tsx)
 *  since a long-lived account's notification history can grow past what's
 *  reasonable to fetch in one request — the Prev/Next *feel* is identical,
 *  only the data-fetch strategy differs from the expense-list precedent. */
export default async function NotificationsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/notifications");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch one extra row to know whether a next page exists, without a
  // separate COUNT(*) query.
  const rows = await getNotifications(user.id, { limit: PAGE_SIZE + 1, offset });
  const hasNext = rows.length > PAGE_SIZE;
  const pageRows = rows.slice(0, PAGE_SIZE);

  return (
    <div>
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
        Notifications
      </h1>

      {/* key={page} forces a remount per page — this is a same-segment
          searchParams navigation, so without the key the client instance
          survives and its useState(initialNotifications) never picks up the
          new props (Round 16 fix #1: Prev/Next changed the buttons but not
          the rendered rows). A remount also cleanly resets `marking` and
          re-registers useNotificationReadSync. */}
      <NotificationsPageClient key={page} initialNotifications={pageRows} page={page} hasNext={hasNext} />
    </div>
  );
}
