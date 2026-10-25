import { z } from "zod";
import { idSchema, optionalText, quantitySchema } from "./common";

/** Goods received, e.g. a supplier delivery. */
export const stockInSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  reason: optionalText(500),
});

/** Manual correction after a stock count, damage or loss. A reason is required for the audit trail. */
export const stockAdjustmentSchema = z.object({
  productId: idSchema,
  quantityChange: z
    .number({ error: "Enter a whole number, e.g. -3 or 5" })
    .int("Must be a whole number")
    .refine((n) => n !== 0, "Change can't be zero"),
  reason: z.string().trim().min(1, "Say why the stock is being adjusted").max(500),
});

export type StockInInput = z.input<typeof stockInSchema>;
export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
