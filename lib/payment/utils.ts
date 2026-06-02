/**
 * Payment utility functions — pure helpers with no React or DB dependencies.
 * Safe to import in both server and client code.
 *
 * UPI app deep links:
 *   upi://          — generic Android intent; does NOT work on iOS (unregistered URI scheme)
 *   tez://upi/pay   — Google Pay; works on iOS + Android
 *   phonepe://pay   — PhonePe;    works on iOS + Android
 *
 * Standard UPI intent params:
 *   pa  — payee VPA (Virtual Payment Address)
 *   am  — amount (numeric string)
 *   cu  — currency (e.g. "INR")
 *   tn  — transaction note (max 50 chars recommended)
 */

/** Standard transaction note for all Clear UPI payments */
export function buildTransactionNote(contextName: string): string {
  return `Clear · ${contextName}`;
}

/** Generic UPI deep link — Android only */
export function buildUpiDeepLink(
  vpa: string,
  amount: number,
  currency: string,
  note: string,
): string {
  const params = new URLSearchParams({
    pa: vpa,
    am: String(amount),
    cu: currency,
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

/** Google Pay deep link — iOS + Android */
export function buildGPayLink(
  vpa: string,
  amount: number,
  currency: string,
  note: string,
): string {
  const params = new URLSearchParams({
    pa: vpa,
    am: String(amount),
    cu: currency,
    tn: note.slice(0, 50),
  });
  return `tez://upi/pay?${params.toString()}`;
}

/** PhonePe deep link — iOS + Android */
export function buildPhonePeLink(
  vpa: string,
  amount: number,
  currency: string,
  note: string,
): string {
  const params = new URLSearchParams({
    pa: vpa,
    am: String(amount),
    cu: currency,
    tn: note.slice(0, 50),
  });
  return `phonepe://pay?${params.toString()}`;
}

/**
 * Clear /pay shareable page URL.
 * Uses userId (not VPA) — the page server-fetches the verified name + avatar.
 * On client: uses window.location.origin so localhost works during dev.
 * On server: uses NEXT_PUBLIC_APP_URL env var.
 */
export function buildPaymentPageUrl(
  payeeUserId: string,
  amount: number,
  currency: string,
  contextName: string,
  groupId?: string,
): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://getclear.app");
  const params = new URLSearchParams({
    to: payeeUserId,
    am: String(amount),
    cu: currency,
    tn: contextName,
  });
  if (groupId) params.set("ref", groupId);
  return `${base}/pay?${params.toString()}`;
}

/**
 * Pre-filled WhatsApp share URL.
 * Opens wa.me — works on iOS, Android, and web.
 */
export function buildWhatsAppRequestUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * UPI QR code content string.
 * All standard UPI apps can read the generic upi:// URI in a QR code
 * even on iOS (QR scanning goes through the camera, not URI scheme dispatch).
 */
export function buildUpiQrContent(
  vpa: string,
  amount: number,
  currency: string,
  note: string,
): string {
  return buildUpiDeepLink(vpa, amount, currency, note);
}
