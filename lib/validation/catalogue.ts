import { z } from "zod";
import { optionalText } from "./common";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalText(500),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactName: optionalText(200),
  email: optionalText(200).pipe(z.email("Enter a valid email").optional()),
  phone: optionalText(50),
  address: optionalText(500),
  leadTimeDays: z.number({ error: "Enter a whole number" }).int().min(0, "Can't be negative").max(60, "At most 60 days").default(2),
  orderCycleDays: z.number({ error: "Enter a whole number" }).int().min(1, "At least 1 day").max(60, "At most 60 days").default(7),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type SupplierInput = z.input<typeof supplierSchema>;
