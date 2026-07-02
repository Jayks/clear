/**
 * Pure allocation logic for confirmStreamSettle: given a debtor's active stream
 * records (oldest first) and the amount they paid, decide which record IDs are
 * fully covered and should be marked "settled".
 *
 * Rules (extracted from app/actions/stream.ts confirmStreamSettle, S-2/S-10 fixes):
 * - If the paid amount covers the full outstanding total (within a 1-paisa
 *   rounding tolerance), every record settles.
 * - Otherwise, walk records oldest → newest, settling only records whose full
 *   amount fits within the remaining paid amount. Stop at the first record that
 *   doesn't fit — never partially settle a single record here (a record is only
 *   ever settled in full).
 */
export function allocateOldestFirstSettlement(
  records: { id: string; amount: number }[],
  paidAmount: number,
): string[] {
  if (records.length === 0) return [];

  const totalOutstanding = records.reduce((s, r) => s + r.amount, 0);

  if (paidAmount >= totalOutstanding - 0.01) {
    return records.map((r) => r.id);
  }

  const toSettleIds: string[] = [];
  let remaining = paidAmount;
  for (const r of records) {
    if (remaining <= 0) break;
    if (r.amount <= remaining + 0.01) {
      toSettleIds.push(r.id);
      remaining -= r.amount;
    } else {
      break;
    }
  }
  return toSettleIds;
}
