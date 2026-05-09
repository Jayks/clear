export type SplitMode = "equal" | "exact" | "percentage" | "shares";

export interface SplitInput {
  memberId: string;
  value?: number; // raw input: omitted for equal, amount for exact, % for percentage, share count for shares
}

export interface SplitResult {
  memberId: string;
  shareAmount: number;
  splitValue: number | null; // raw input stored for re-display
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Distribute a rounding remainder (cents) to the first split. */
function fixRounding(splits: SplitResult[], total: number): SplitResult[] {
  const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
  const diff = round2(total - sum);
  if (diff === 0 || splits.length === 0) return splits;
  return splits.map((s, i) =>
    i === 0 ? { ...s, shareAmount: round2(s.shareAmount + diff) } : s
  );
}

export function computeEqual(amount: number, memberIds: string[]): SplitResult[] {
  if (memberIds.length === 0) return [];
  const share = round2(amount / memberIds.length);
  const splits: SplitResult[] = memberIds.map((memberId) => ({
    memberId,
    shareAmount: share,
    splitValue: null,
  }));
  return fixRounding(splits, amount);
}

export function computeExact(
  _amount: number,
  inputs: SplitInput[]
): { ok: true; splits: SplitResult[] } | { ok: false; error: string } {
  const total = inputs.reduce((acc, i) => acc + (i.value ?? 0), 0);
  const rounded = round2(total);
  if (rounded !== round2(_amount)) {
    return { ok: false, error: `Amounts sum to ${rounded}, expected ${round2(_amount)}` };
  }
  return {
    ok: true,
    splits: inputs.map((i) => ({
      memberId: i.memberId,
      shareAmount: round2(i.value ?? 0),
      splitValue: i.value ?? 0,
    })),
  };
}

export function computePercentage(
  amount: number,
  inputs: SplitInput[]
): { ok: true; splits: SplitResult[] } | { ok: false; error: string } {
  const totalPct = inputs.reduce((acc, i) => acc + (i.value ?? 0), 0);
  if (round2(totalPct) !== 100) {
    return { ok: false, error: `Percentages sum to ${round2(totalPct)}%, expected 100%` };
  }
  const splits: SplitResult[] = inputs.map((i) => ({
    memberId: i.memberId,
    shareAmount: round2(amount * ((i.value ?? 0) / 100)),
    splitValue: i.value ?? 0,
  }));
  return { ok: true, splits: fixRounding(splits, amount) };
}

export function computeShares(
  amount: number,
  inputs: SplitInput[]
): { ok: true; splits: SplitResult[] } | { ok: false; error: string } {
  const totalShares = inputs.reduce((acc, i) => acc + (i.value ?? 0), 0);
  if (totalShares <= 0) {
    return { ok: false, error: "Total shares must be greater than 0" };
  }
  const splits: SplitResult[] = inputs.map((i) => ({
    memberId: i.memberId,
    shareAmount: round2(amount * ((i.value ?? 0) / totalShares)),
    splitValue: i.value ?? 0,
  }));
  return { ok: true, splits: fixRounding(splits, amount) };
}

export function computeSplits(
  mode: SplitMode,
  amount: number,
  inputs: SplitInput[]
): { ok: true; splits: SplitResult[] } | { ok: false; error: string } {
  switch (mode) {
    case "equal":
      return { ok: true, splits: computeEqual(amount, inputs.map((i) => i.memberId)) };
    case "exact":
      return computeExact(amount, inputs);
    case "percentage":
      return computePercentage(amount, inputs);
    case "shares":
      return computeShares(amount, inputs);
  }
}
