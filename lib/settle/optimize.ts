export interface MemberBalance {
  memberId: string;
  net: number; // positive = creditor (owed money), negative = debtor (owes money)
}

export interface Transaction {
  from: string; // memberId who pays
  to: string;   // memberId who receives
  amount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Given per-member net balances, return the minimum set of transactions
 * to settle all debts. Produces at most n-1 transactions for n members.
 */
export function optimizeSettlements(balances: MemberBalance[]): Transaction[] {
  const creditors: { memberId: string; amount: number }[] = [];
  const debtors:   { memberId: string; amount: number }[] = [];

  for (const { memberId, net } of balances) {
    const rounded = round2(net);
    if (rounded > 0)  creditors.push({ memberId, amount: rounded });
    if (rounded < 0)  debtors.push({ memberId, amount: Math.abs(rounded) });
  }

  // Sort descending so the largest debts are paired first. This keeps both
  // lists in step and guarantees the minimum number of transactions.
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];
    const transfer = round2(Math.min(creditor.amount, debtor.amount));

    if (transfer > 0) {
      transactions.push({ from: debtor.memberId, to: creditor.memberId, amount: transfer });
    }

    creditor.amount = round2(creditor.amount - transfer);
    debtor.amount   = round2(debtor.amount   - transfer);

    if (creditor.amount === 0) ci++;
    if (debtor.amount   === 0) di++;
  }

  return transactions;
}

/**
 * Naive baseline: how many pairwise transfers would be needed if every net debtor
 * paid every net creditor directly (the "before optimization" case), vs. the
 * minimum-transaction plan `optimizeSettlements` actually returns. Used only to
 * power the "N instead of M — we netted out the rest" trust copy; never used for
 * real transactions.
 *
 * Pure upper-bound heuristic (debtorCount × creditorCount) — NOT a literal
 * reconstruction of raw per-expense IOUs. Documented here so a future reader
 * doesn't expect this to match exact transaction history.
 */
export function countNaivePairwiseTransactions(balances: MemberBalance[]): number {
  let creditors = 0;
  let debtors = 0;
  for (const { net } of balances) {
    const rounded = round2(net);
    if (rounded > 0) creditors++;
    if (rounded < 0) debtors++;
  }
  return creditors * debtors;
}
