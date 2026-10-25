// Integer-cent arithmetic for the browser, where Prisma's Decimal isn't available.
// Used only to PREVIEW sale totals while the cashier builds a cart; the server
// recalculates everything with Decimal (lib/money.ts) and has the final say.
// The rounding below matches calculateSaleTotals exactly (half up, 2 places).

/** "12.5" -> 1250. Returns null for anything that isn't a valid amount. */
export function toCents(amount: string): number | null {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** 1250 -> "12.50" (the format the server's moneySchema accepts). */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function previewSaleTotals(
  lines: { unitPrice: string; quantity: number }[],
  discountCents: number,
  taxRatePercent: string,
) {
  const subtotal = lines.reduce((sum, line) => sum + (toCents(line.unitPrice) ?? 0) * line.quantity, 0);
  const taxable = subtotal - discountCents;
  // taxRate has 2 decimals, so rate * 100 is a whole number of basis points.
  const basisPoints = toCents(taxRatePercent) ?? 0;
  const tax = taxable > 0 ? Math.floor((taxable * basisPoints + 5000) / 10000) : 0;
  return { subtotal, discount: discountCents, tax, total: taxable + tax };
}
