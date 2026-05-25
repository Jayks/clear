import Link from "next/link";
import { Receipt, ArrowLeftRight, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { getGroupActivity } from "@/lib/db/queries/activity";
import { getCategory } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/db/queries/activity";

interface Props {
  groupId: string;
  currentMemberId: string | undefined;
  groupType: "trip" | "nest";
}

export function ActivityFeedSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: ActivityEvent["type"] }) {
  if (type === "expense") {
    return <Receipt className="w-2.5 h-2.5 text-cyan-500" />;
  }
  if (type === "settlement") {
    return <ArrowLeftRight className="w-2.5 h-2.5 text-emerald-500" />;
  }
  return <UserPlus className="w-2.5 h-2.5 text-violet-500" />;
}

function getPrimaryText(event: ActivityEvent, currentMemberId: string | undefined): string {
  const isActor = event.actorMemberId === currentMemberId;

  if (event.type === "expense") {
    const who = isActor ? "You" : event.actorName;
    return `${who} added ${event.description}`;
  }

  if (event.type === "settlement") {
    if (isActor) return `You paid ${event.otherName}`;
    if (event.otherMemberId === currentMemberId) return `${event.actorName} paid you`;
    return `${event.actorName} paid ${event.otherName}`;
  }

  // member_joined
  return isActor ? "You joined the group" : `${event.actorName} joined`;
}

function getMetaText(event: ActivityEvent): string {
  const relTime = formatDistanceToNow(event.activityAt, { addSuffix: true });

  if (event.type === "expense") {
    const cat = getCategory(event.category);
    return `${cat.label} · ${relTime}`;
  }
  if (event.type === "settlement") {
    return `Settlement · ${relTime}`;
  }
  return relTime;
}

export async function GroupActivityFeed({ groupId, currentMemberId, groupType }: Props) {
  const limit = groupType === "nest" ? 5 : 3;
  const events = await getGroupActivity(groupId, limit as 3 | 5);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Recent activity
        </p>
        <Link
          href={`/groups/${groupId}/expenses`}
          className="text-xs text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
        >
          See all →
        </Link>
      </div>

      {events.length === 0 ? (
        <Link
          href={`/groups/${groupId}/expenses/new`}
          className="glass-sm rounded-xl px-4 py-5 flex flex-col items-center gap-1 text-center hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet</p>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
            Add the first expense →
          </p>
        </Link>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => {
            const primaryText = getPrimaryText(event, currentMemberId);
            const metaText = getMetaText(event);
            const amount =
              event.type !== "member_joined" ? event.amount : null;
            const currency =
              event.type !== "member_joined" ? event.currency : null;

            return (
              <Link
                key={event.id}
                href={`/groups/${groupId}/expenses`}
                className="glass-sm rounded-xl px-3 py-2.5 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                {/* Avatar with event-type badge */}
                <div className="relative shrink-0">
                  <MemberAvatar name={event.actorName} size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                    <EventIcon type={event.type} />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug truncate">
                    {primaryText}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {metaText}
                  </p>
                </div>

                {/* Amount */}
                {amount !== null && currency !== null && (
                  <p
                    className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular shrink-0"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {formatCurrency(amount, currency)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
