/**
 * lib/payment-requests/whatsapp.ts
 *
 * Pure message-building helpers for payment-request reminders.
 * No DB, no env vars — all inputs are injected so these are fully unit-testable.
 *
 * Two message types:
 *  1. buildCircleReminderMessage — group-level WhatsApp blast with per-ghost
 *     payment links (for pasting into a WhatsApp group).
 *  2. buildPersonalRequestMessage — one-to-one direct message to a single
 *     ghost member with their personal payment link.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

function makeProgressBar(paidCount: number, total: number): string {
  const filled = Math.round((paidCount / Math.max(total, 1)) * 8);
  return "█".repeat(filled) + "░".repeat(8 - filled);
}

// ── buildCircleReminderMessage ────────────────────────────────────────────────

export interface CircleReminderOpts {
  circleName: string;
  /** "June 2026" for recurring; null for one-time. */
  periodLabel: string | null;
  paidCount: number;
  totalCount: number;
  /** Ghost members who have NOT yet paid — each has a generated payment token. */
  pendingMembers: { name: string; token: string }[];
  /** Clear-account members who haven't paid (app handles their reminders). */
  pendingClearNames: string[];
  /** null for Flexi one-time circles. */
  amount: number | null;
  currency: string;
  joinUrl: string;
  /** Base URL for /request/[token] links — e.g. "https://clear.app". */
  appUrl: string;
}

/**
 * Builds a WhatsApp group reminder message.
 *
 * - Includes an ASCII progress bar.
 * - Lists all pending members (ghost + Clear-account) in one "Still pending:" line.
 * - Appends a personalised "/request/[token]" link for each ghost below (so
 *   the admin can copy & forward the relevant line to each person if desired).
 * - For Flexi circles (amount=null), no amount is included.
 */
export function buildCircleReminderMessage(opts: CircleReminderOpts): string {
  const {
    circleName,
    periodLabel,
    paidCount,
    totalCount,
    pendingMembers,
    pendingClearNames,
    joinUrl,
    appUrl,
  } = opts;

  const bar = makeProgressBar(paidCount, totalCount);
  const periodPrefix = periodLabel ? `${periodLabel}: ` : "";

  // Combined pending names for the status line (ghosts first, then Clear users)
  const allPendingNames = [
    ...pendingMembers.map((m) => m.name),
    ...pendingClearNames,
  ];

  const pendingStr =
    allPendingNames.length <= 4
      ? allPendingNames.join(", ")
      : `${allPendingNames.slice(0, 3).join(", ")} (+${allPendingNames.length - 3} more)`;

  const lines: string[] = [
    `Hey team! ${circleName}`,
    `${periodPrefix}${paidCount}/${totalCount} paid ${bar}`,
    "",
  ];

  if (allPendingNames.length > 0) {
    lines.push(`Still pending: ${pendingStr}`);
  } else {
    lines.push("Everyone has paid 🎉");
  }

  // Per-ghost payment links — shown separately so admins can forward them
  if (pendingMembers.length > 0) {
    lines.push("");
    lines.push("Pay your share →");
    for (const m of pendingMembers) {
      lines.push(` • ${m.name}: ${appUrl}/request/${m.token}`);
    }
  }

  lines.push("");
  lines.push(`Track it → ${joinUrl}`);

  return lines.join("\n");
}

// ── buildPersonalRequestMessage ───────────────────────────────────────────────

export interface PersonalRequestOpts {
  /** Ghost member's full name — first name is used in the greeting. */
  payerName: string;
  circleName: string;
  /** "June 2026" for recurring; null for one-time. */
  periodLabel: string | null;
  /** null for Flexi one-time circles. */
  amount: number | null;
  currency: string;
  /** Full URL including the token — e.g. "https://clear.app/request/abc-123". */
  requestUrl: string;
  upiId: string | null;
}

/**
 * Builds a personalised one-to-one WhatsApp message for a single ghost member.
 *
 * Compact and friendly: uses first name only, omits amount line for Flexi circles,
 * optionally shows the UPI ID as an alternative.
 */
export function buildPersonalRequestMessage(opts: PersonalRequestOpts): string {
  const { payerName, circleName, periodLabel, amount, currency, requestUrl, upiId } =
    opts;

  const firstName = payerName.split(" ")[0];
  const periodSuffix = periodLabel ? ` for ${periodLabel}` : "";

  const lines: string[] = [
    `Hey ${firstName}! 👋`,
    "",
    `Quick reminder to pay your contribution${periodSuffix} to ${circleName}.`,
    "",
  ];

  if (amount !== null) {
    const amtStr = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
    lines.push(`Amount: ${amtStr}`);
  }

  lines.push(`Pay here → ${requestUrl}`);

  if (upiId) {
    lines.push(`(UPI: ${upiId})`);
  }

  return lines.join("\n");
}
