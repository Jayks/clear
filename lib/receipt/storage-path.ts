const BUCKET_MARKER = "/receipt-photos/";

/**
 * Resolves the in-bucket object path from a stored `expenses.receiptUrl`.
 *
 * The stored value is either a full public URL (legacy rows) or a bare in-bucket
 * path (current uploads). Either way we want the path *after* the bucket name so
 * it can be passed to `storage.from("receipt-photos").createSignedUrl/remove`.
 */
export function extractReceiptStoragePath(receiptUrl: string): string {
  const idx = receiptUrl.indexOf(BUCKET_MARKER);
  return idx >= 0 ? receiptUrl.slice(idx + BUCKET_MARKER.length) : receiptUrl;
}
