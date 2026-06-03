/**
 * Shared payment types used across all four contexts
 * (Trips, Nests, Streams, Circles) and the /pay public page.
 */

/** Payment method stored in DB — matches CHECK constraint on settlements tables */
export type PaymentMethod = "upi" | "cash" | "bank_transfer" | "other";

/**
 * Which UPI app button was tapped — used to show app-specific UTR instructions
 * in PaymentConfirmPrompt after the user returns from the UPI app.
 */
export type TappedApp = "gpay" | "phonepe" | "any_upi";

/**
 * Direction from the VIEWER's perspective:
 *   debtor   = viewer owes money → sees Pay (UpiPayButton)
 *   creditor = viewer is owed money → sees Request (UpiRequestButton)
 */
export type PaymentDirection = "debtor" | "creditor";

/** Which product context triggered the payment flow */
export type PaymentContext = "trip" | "nest" | "stream" | "circle";

/** One party in a payment — payer or payee */
export interface PaymentParty {
  userId:      string;
  name:        string;
  /** VPA string of the default UPI ID, or null if none saved */
  defaultUpiId: string | null;
  /** All saved VPA strings (Phase 2 v1: shown in QR label only; Phase 4 v2: selectable) */
  allUpiIds?:  string[];
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi:           "UPI",
  cash:          "Cash",
  bank_transfer: "Bank Transfer",
  other:         "Other",
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  upi:           "💸",
  cash:          "💵",
  bank_transfer: "🏦",
  other:         "💳",
};
