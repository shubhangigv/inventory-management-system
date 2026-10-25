import { z } from "zod";
import { optionalText } from "./common";

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  address: optionalText(500),
  phone: optionalText(50),
  email: optionalText(200).pipe(z.email("Enter a valid email").optional()),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code such as INR or USD")
    .refine((code) => Intl.supportedValuesOf("currency").includes(code), "Unknown currency code"),
  // Percent with up to 2 decimals, 0-100 (also enforced by a CHECK constraint).
  taxRate: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a rate like 18 or 12.5")
    .refine((rate) => Number(rate) <= 100, "Tax rate can't be more than 100%"),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Prefix is required")
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, digits or dashes")
    .transform((prefix) => prefix.toUpperCase()),
});

export type BusinessSettingsInput = z.input<typeof businessSettingsSchema>;
