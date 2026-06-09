/**
 * SplitAmount — renders a currency amount with the symbol at lighter weight
 * than the number, creating visual hierarchy: ₹ (medium) vs 1,234 (bold).
 *
 * Usage:
 *   <SplitAmount amount={1234.5} currency="INR" className="text-xl text-emerald-600" />
 */

import { DEFAULT_CURRENCY, CURRENCY_LOCALE } from "@/lib/utils";

interface Props {
  amount:      number;
  currency?:   string;
  className?:  string;  // applied to the wrapper span (font-size, color, etc.)
  /** Decimal places — default 0 for whole amounts, 2 for precise */
  decimals?:   number;
}

export function SplitAmount({ amount, currency = DEFAULT_CURRENCY, className = "", decimals = 0 }: Props) {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";

  // Format with the symbol
  const full = new Intl.NumberFormat(locale, {
    style:                  "currency",
    currency,
    minimumFractionDigits:  decimals,
    maximumFractionDigits:  decimals,
  }).format(amount);

  // Split at first digit — everything before = symbol/prefix, rest = number
  const match = full.match(/^([^\d]*)(\d[\d,.\s]*)([^\d]*)$/);
  if (!match) return <span className={className}>{full}</span>;

  const [, prefix, number, suffix] = match;

  return (
    <span className={className}>
      {prefix && (
        <span className="font-medium opacity-70">{prefix}</span>
      )}
      <span>{number}</span>
      {suffix && (
        <span className="font-medium opacity-70">{suffix}</span>
      )}
    </span>
  );
}
