import { z } from "zod";
import { idSchema, moneySchema, optionalText } from "./common";

export const createProductSchema = z.object({
  // SKUs are stored upper-case so "abc-1" and "ABC-1" can't both exist.
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, digits, dots, dashes or underscores")
    .transform((sku) => sku.toUpperCase()),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalText(2000),
  costPrice: moneySchema,
  sellingPrice: moneySchema,
  // Recorded as a STOCK_IN movement, never written straight into stockQuantity.
  openingStock: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  categoryId: idSchema.optional(),
  supplierId: idSchema.optional(),
});

/** What callers pass in (defaults are optional). */
export type CreateProductInput = z.input<typeof createProductSchema>;
