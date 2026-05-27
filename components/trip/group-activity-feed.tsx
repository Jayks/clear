import type React from "react";
import Link from "next/link";
import { Receipt, ArrowLeftRight, UserPlus, AlertTriangle, Activity } from "lucide-react";
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
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
        <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

const EVENT_BADGE: Record<ActivityEvent["type"], { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  expense:       { icon: Receipt,        bg: "bg-cyan-50 dark:bg-cyan-900/40",    border: "border-cyan-200 dark:border-cyan-800/60",    iconColor: "text-cyan-500 dark:text-cyan-400"    },
  settlement:    { icon: ArrowLeftRight, bg: "bg-emerald-50 dark:bg-emerald-900/40", border: "border-emerald-200 dark:border-emerald-800/60", iconColor: "text-emerald-500 dark:text-emerald-400" },
  dispute:       { icon: AlertTriangle,  bg: "bg-amber-50 dark:bg-amber-900/40",  border: "border-amber-200 dark:border-amber-800/60",  iconColor: "text-amber-500 dark:text-amber-400"  },
  member_joined: { icon: UserPlus,       bg: "bg-violet-50 dark:bg-violet-900/40", border: "border-violet-200 dark:border-violet-800/60", iconColor: "text-violet-500 dark:text-violet-400" },
};

function EventBadge({ type }: { type: ActivityEvent["type"] }) {
  const { icon: Icon, bg, border, iconColor } = EVENT_BADGE[type];
  return (
    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${bg} border ${border} flex items-center justify-center shadow-sm`}>
      <Icon className={`w-2.5 h-2.5 ${iconColor}`} />
    </div>
  );
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

  if (event.type === "dispute") {
    const who = isActor ? "You" : event.actorName;
    return `${who} raised a dispute on ${event.description}`;
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
  if (event.type === "dispute") {
    return `Dispute · ${relTime}`;
  }
  return relTime;
}

export async function GroupActivityFeed({ groupId, currentMemberId, groupType }: Props) {
  const limit = 5;
  const events = await getGroupActivity(groupId, limit as 3 | 5);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent activity</span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-slate-300/60 to-transparent dark:from-slate-600/50 dark:to-transparent" />
        <Link
          href={`/groups/${groupId}/expenses`}
          className="text-xs text-cyan-600 dark:text-cyan-400 font-medium hover:underline shrink-0"
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
              (event.type === "expense" || event.type === "settlement") ? event.amount : null;
            const currency =
              (event.type === "expense" || event.type === "settlement") ? event.currency : null;
            const href =
              event.type === "expense"
                ? `/groups/${groupId}/expenses/${event.id}/thread`
                : event.type === "dispute"
                  ? `/groups/${groupId}/expenses/${event.expenseId}/thread`
                  : event.type === "settlement"
                    ? `/groups/${groupId}/settle`
                    : `/groups/${groupId}/members`;

            return (
              <Link
                key={event.id}
                href={href}
                className="glass-sm rounded-xl px-3 py-2.5 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                {/* Avatar with event-type badge */}
                <div className="relative shrink-0">
                  <MemberAvatar name={event.actorName} size="sm" />
                  <EventBadge type={event.type} />
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
