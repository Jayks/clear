import {
  Coins, ArrowLeftRight, MessageCircle, AlertTriangle, HandCoins, MapPin, Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationType } from "@/lib/db/schema/notifications";

/**
 * Icon + accent colour per notification domain, grouped to match this app's
 * existing colour-identity system (violet=Circles, blue=Streams, cyan=
 * Expenses/comments, amber=disputes, emerald=Settle) rather than inventing a
 * new palette per event type — the inbox is a mirror of events that already
 * have a "home" colour elsewhere in the app.
 */
const NOTIFICATION_META: Record<NotificationType, { icon: LucideIcon; iconClass: string; bgClass: string }> = {
  contribution_pending:   { icon: Coins,          iconClass: "text-violet-500 dark:text-violet-400", bgClass: "bg-violet-50 dark:bg-violet-900/30" },
  contribution_confirmed: { icon: Coins,          iconClass: "text-violet-500 dark:text-violet-400", bgClass: "bg-violet-50 dark:bg-violet-900/30" },
  contribution_disputed:  { icon: Coins,          iconClass: "text-violet-500 dark:text-violet-400", bgClass: "bg-violet-50 dark:bg-violet-900/30" },
  stream_entry_logged:    { icon: ArrowLeftRight, iconClass: "text-blue-500 dark:text-blue-400",     bgClass: "bg-blue-50 dark:bg-blue-900/30" },
  stream_settle_pending:  { icon: ArrowLeftRight, iconClass: "text-blue-500 dark:text-blue-400",     bgClass: "bg-blue-50 dark:bg-blue-900/30" },
  stream_settle_confirmed:{ icon: ArrowLeftRight, iconClass: "text-blue-500 dark:text-blue-400",     bgClass: "bg-blue-50 dark:bg-blue-900/30" },
  stream_disputed:        { icon: ArrowLeftRight, iconClass: "text-blue-500 dark:text-blue-400",     bgClass: "bg-blue-50 dark:bg-blue-900/30" },
  expense_added:          { icon: Receipt,        iconClass: "text-cyan-600 dark:text-cyan-400",     bgClass: "bg-cyan-50 dark:bg-cyan-900/30" },
  expense_mention:        { icon: MessageCircle,  iconClass: "text-cyan-600 dark:text-cyan-400",     bgClass: "bg-cyan-50 dark:bg-cyan-900/30" },
  expense_comment:        { icon: MessageCircle,  iconClass: "text-cyan-600 dark:text-cyan-400",     bgClass: "bg-cyan-50 dark:bg-cyan-900/30" },
  dispute_raised:         { icon: AlertTriangle,  iconClass: "text-amber-500 dark:text-amber-400",   bgClass: "bg-amber-50 dark:bg-amber-900/30" },
  dispute_resolved:       { icon: AlertTriangle,  iconClass: "text-amber-500 dark:text-amber-400",   bgClass: "bg-amber-50 dark:bg-amber-900/30" },
  settlement_recorded:    { icon: HandCoins,      iconClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-900/30" },
  trip_wrapup:            { icon: MapPin,         iconClass: "text-cyan-600 dark:text-cyan-400",     bgClass: "bg-cyan-50 dark:bg-cyan-900/30" },
};

export function getNotificationMeta(type: NotificationType) {
  return NOTIFICATION_META[type] ?? NOTIFICATION_META.trip_wrapup;
}
