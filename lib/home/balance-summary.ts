import type { HomeBalanceEntry } from "../db/queries/balances";
import { DEFAULT_CURRENCY } from "../utils";

/**
 * Home-page net-position summary — pure aggregation over the per-group balances
 * already fetched for the card badges (`getHomeBalances`). Powers the directional
 * "Owed / You owe" strip under the greeting.
 *
 * Design decisions baked in here (see audit discussion):
 * - **Circles excluded** — wallet model, no per-user bilateral debt.
 * - **Demo groups excluded** — the sample Goa trip must not inflate a real net.
 * - **Multi-currency groups excluded from totals** — their net is only the
 *   default-currency slice, so it's not a trustworthy figure. They still count
 *   as "activity" so we never mislabel an active user as brand-new.
 * - **No blended net** — we report gross owed / owe directionally, matching the
 *   app's existing `HeroBalancePill` grammar (never a single net number).
 * - **Cross-currency can't be summed** — we pick the dominant currency by gross
 *   volume and surface the rest as `otherCurrencyCount`.
 */

export interface HomeGroupMeta {
  id: string;
  name: string;
  groupType: string; // 'trip' | 'nest' | 'circle'
  isDemo: boolean;
}

export interface HomeBalanceRow {
  groupId: string;
  name: string;
  groupType: string; // 'trip' | 'nest' (circles never produce a row)
  net: number; // + = user is owed, − = user owes
  currency: string;
}

export type HomeBalanceState = "new" | "settled" | "active";

export interface HomeBalanceSummary {
  state: HomeBalanceState;
  currency: string; // dominant currency (DEFAULT_CURRENCY when nothing reckonable)
  totalOwed: number; // sum of positive nets in the dominant currency
  totalOwe: number; // sum of |negative nets| in the dominant currency
  otherCurrencyCount: number; // additional currencies carrying a non-zero net
  rows: HomeBalanceRow[]; // dominant-currency, non-zero, sorted |net| desc then name
  groupsWithBalance: number; // rows.length — the strip expands when this is >= 2
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function emptySummary(state: HomeBalanceState): HomeBalanceSummary {
  return {
    state,
    currency: DEFAULT_CURRENCY,
    totalOwed: 0,
    totalOwe: 0,
    otherCurrencyCount: 0,
    rows: [],
    groupsWithBalance: 0,
  };
}

export function computeHomeBalanceSummary(
  entries: Record<string, HomeBalanceEntry>,
  groups: HomeGroupMeta[],
): HomeBalanceSummary {
  // Eligible = trips & nests only (circles are wallet-based), non-demo, and
  // present in the balances map.
  const eligible = groups.filter(
    (g) =>
      (g.groupType === "trip" || g.groupType === "nest") &&
      !g.isDemo &&
      entries[g.id] !== undefined,
  );

  const hasActivity = eligible.some((g) => entries[g.id].hasExpenses);
  if (!hasActivity) return emptySummary("new");

  // "Reckonable" = the net is a trustworthy single-currency figure.
  const reckonable = eligible.filter((g) => !entries[g.id].hasMixedCurrencies);

  // Bucket non-zero nets by currency to pick the dominant one.
  const byCurrency = new Map<string, { gross: number; count: number }>();
  for (const g of reckonable) {
    const { net, currency } = entries[g.id];
    if (net === 0) continue;
    const b = byCurrency.get(currency) ?? { gross: 0, count: 0 };
    b.gross += Math.abs(net);
    b.count += 1;
    byCurrency.set(currency, b);
  }

  // Activity exists but everything reckonable nets to zero → genuinely settled.
  if (byCurrency.size === 0) return emptySummary("settled");

  // Dominant currency: most gross volume, tie-break by group count then code.
  const dominant = [...byCurrency.entries()].sort(
    (a, b) =>
      b[1].gross - a[1].gross ||
      b[1].count - a[1].count ||
      a[0].localeCompare(b[0]),
  )[0][0];

  const otherCurrencyCount = byCurrency.size - 1;

  const rows: HomeBalanceRow[] = reckonable
    .filter((g) => entries[g.id].currency === dominant && entries[g.id].net !== 0)
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      groupType: g.groupType,
      net: entries[g.id].net,
      currency: dominant,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));

  let totalOwed = 0;
  let totalOwe = 0;
  for (const r of rows) {
    if (r.net > 0) totalOwed += r.net;
    else totalOwe += -r.net;
  }

  return {
    state: "active",
    currency: dominant,
    totalOwed: round2(totalOwed),
    totalOwe: round2(totalOwe),
    otherCurrencyCount,
    rows,
    groupsWithBalance: rows.length,
  };
}
