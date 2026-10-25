import { z } from "zod";
import { PaymentMethod } from "@/app/generated/prisma/enums";
import { idSchema, moneySchema, optionalText, quantitySchema } from "./common";

// Note: the client sends only product IDs and quantities, never prices.
// The server always uses the price stored in the database.
export const createSaleSchema = z.object({
  items: z
    .array(z.object({ productId: idSchema, quantity: quantitySchema }))
    .min(1, "Add at least one product")
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      "Each product can appear only once; increase its quantity instead",
    ),
  payments: z
    .array(
      z.object({
        method: z.enum(PaymentMethod),
        amount: moneySchema,
        reference: optionalText(100),
      }),
    )
    .min(1, "Add a payment"),
  discountAmount: moneySchema.default("0"),
  customerName: optionalText(200),
  notes: optionalText(1000),
  // Defaults to now. Can be set to an earlier date when entering a paper invoice.
  soldAt: z.coerce
    .date()
    .refine((date) => date.getTime() <= Date.now(), "Sale date can't be in the future")
    .optional(),
});

export const cancelSaleSchema = z.object({
  saleId: idSchema,
  reason: z.string().trim().min(1, "Say why the sale is being cancelled").max(500),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CancelSaleInput = z.input<typeof cancelSaleSchema>;
