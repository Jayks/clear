/**
 * Build/parse/validate the `notes` payload carried on every Razorpay order —
 * pure, no DB/network. See RAZORPAY_PLAN.md §6/§7, D10.
 *
 * Razorpay's notes API stores arbitrary key→string pairs and echoes them back
 * verbatim on the order and on the payment. `notes.userId` is what lets
 * `confirmPassPurchase` prove an order belongs to the calling user without
 * trusting any client-supplied id — signature verification alone proves
 * payment↔order integrity, not order↔caller ownership.
 */

import { PASS_DURATION_DAYS, type PassType } from "../subscription/entitlement";

export interface OrderNotesInput {
  userId: string;
  passType: PassType;
  earlyBird: boolean;
}

/** What Razorpay actually stores/returns: string values only. */
export type RazorpayNotes = Record<string, string>;

export interface ParsedOrderNotes {
  userId: string;
  passType: PassType;
  earlyBird: boolean;
}

/** Build the `notes` object to send at order creation (`createOrder`). */
export function buildOrderNotes({ userId, passType, earlyBird }: OrderNotesInput): RazorpayNotes {
  return { userId, passType, earlyBird: String(earlyBird) };
}

/**
 * Parse+validate notes read back from Razorpay (order or payment entity).
 * Returns null for anything that doesn't look like a notes object we wrote
 * ourselves — a missing/foreign order must never be trusted.
 */
export function parseOrderNotes(notes: unknown): ParsedOrderNotes | null {
  if (!notes || typeof notes !== "object") return null;
  const rec = notes as Record<string, unknown>;
  const { userId, passType, earlyBird } = rec;
  if (typeof userId !== "string" || !userId) return null;
  if (typeof passType !== "string" || !(passType in PASS_DURATION_DAYS)) return null;
  return { userId, passType: passType as PassType, earlyBird: earlyBird === "true" || earlyBird === true };
}

/** The D10 ownership check: does this order belong to the calling user? */
export function isOwnedBy(notes: ParsedOrderNotes | null, currentUserId: string): boolean {
  return notes !== null && notes.userId === currentUserId;
}

/** Razorpay requires `receipt` ≤ 40 chars. Deterministic so it's testable. */
export function buildReceiptId(userId: string, now: number): string {
  return `pass_${userId.slice(0, 8)}_${now}`;
}
