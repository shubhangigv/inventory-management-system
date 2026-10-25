import { z } from "zod";

// Building blocks shared by the other validation schemas.

export const idSchema = z.string().trim().min(1, "Required");

/** Optional free text: trims it, and turns "" into undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

/**
 * A money amount from a form or API: "12.50" or 12.5.
 * At most 10 digits before the point and 2 after, matching Decimal(12, 2).
 * The output is a string so it can go straight into a Decimal without float rounding.
 */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 12 or 12.50"));

export const quantitySchema = z.number().int("Must be a whole number").positive("Must be at least 1");
