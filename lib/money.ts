import { Prisma } from "@/app/generated/prisma/client";

// Money is handled with Decimal (decimal.js, bundled with Prisma), never with
// JavaScript numbers: 0.1 + 0.2 === 0.30000000000000004 in plain JS.
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
export type DecimalInput = Prisma.Decimal | string | number;

/** Rounds to 2 decimal places, halves away from zero (12.345 -> 12.35). */
export function roundMoney(value: DecimalInput): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sumMoney(values: DecimalInput[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0));
}

export type SaleTotals = {
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
};

/**
 * Prices are tax-exclusive. Tax is charged on the amount after discount:
 *   subtotal = sum(quantity * unitPrice)
 *   tax      = (subtotal - discount) * taxRate%
 *   total    = subtotal - discount + tax
 */
export function calculateSaleTotals(
  lines: { unitPrice: DecimalInput; quantity: number }[],
  discountAmount: DecimalInput,
  taxRatePercent: DecimalInput,
): SaleTotals {
  const subtotal = roundMoney(sumMoney(lines.map((line) => new Decimal(line.unitPrice).times(line.quantity))));
  const discount = roundMoney(discountAmount);
  const taxable = subtotal.minus(discount);
  const taxAmount = roundMoney(taxable.times(taxRatePercent).dividedBy(100));
  return {
    subtotal,
    discountAmount: discount,
    taxAmount,
    totalAmount: taxable.plus(taxAmount),
  };
}
