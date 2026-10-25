import { prisma } from "@/lib/prisma";
import type { Tx } from "./types";

// BusinessSettings has exactly one row, always with id 1.
const SETTINGS_ID = 1;

/** Returns the settings, creating the row with default values on first use. */
export function getBusinessSettings() {
  return prisma.businessSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });
}

export function formatInvoiceNumber(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(6, "0")}`;
}

/**
 * Hands out the next invoice number, e.g. INV-000042.
 *
 * Must run inside the sale's transaction. The increment locks the settings row
 * until the transaction ends, so concurrent sales get different numbers, and if
 * the sale fails the increment is rolled back too (no gaps in invoice numbers).
 */
export async function reserveInvoiceNumber(tx: Tx) {
  const settings = await tx.businessSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, nextInvoiceNumber: 2 },
    update: { nextInvoiceNumber: { increment: 1 } },
  });
  return {
    invoiceNumber: formatInvoiceNumber(settings.invoicePrefix, settings.nextInvoiceNumber - 1),
    taxRate: settings.taxRate,
  };
}
