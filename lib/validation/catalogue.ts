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
});

export type CategoryInput = z.input<typeof categorySchema>;
export type SupplierInput = z.input<typeof supplierSchema>;
