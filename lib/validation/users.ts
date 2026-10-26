import { z } from "zod";
import { idSchema } from "./common";

const roleSchema = z.enum(["ADMIN", "STAFF"], { error: "Choose a role" });

// Emails are stored lower-case so "Asha@Shop.com" and "asha@shop.com" are one account.
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email").max(200));

// Length matters more than character rules (NIST SP 800-63B). The upper limit
// stops someone from making the server hash a megabyte-long "password".
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: emailSchema,
  role: roleSchema,
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  userId: idSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
