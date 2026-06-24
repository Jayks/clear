import { formatCurrency } from "../utils";
import { BRAND } from "../brand";

export interface StreamConfirmMessageOpts {
  creatorFirstName: string;
  amount:           number;
  currency:         string;
  note:             string | null;
  direction:        "they_owe_me" | "i_owe_them";
  confirmUrl:       string;
}

/**
 * Builds the WhatsApp message a Clear user sends a guest counterpart to confirm
 * a logged Stream entry. Direction-aware: a creator's own debt must read the
 * opposite way to a guest's debt, or the message is factually backwards.
 *
 * Shared by the immediate post-log share step (StreamLogSheet) and the
 * persistent re-share action on pending guest entries (StreamSpineView) — one
 * source of truth instead of two inline copies that can drift apart.
 */
export function buildStreamConfirmMessage(opts: StreamConfirmMessageOpts): string {
  const { creatorFirstName, amount, currency, note, direction, confirmUrl } = opts;
  const amt = formatCurrency(amount, currency);
  const noteClause = note ? ` for ${note}` : "";
  const owesLine = direction === "they_owe_me"
    ? `You owe ${amt}${noteClause}.`
    : `${creatorFirstName} owes you ${amt}${noteClause}.`;
  return `Hi! ${creatorFirstName} logged a payment on ${BRAND.name}.\n${owesLine}\nConfirm here → ${confirmUrl}`;
}
