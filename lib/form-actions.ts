import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { AppError } from "@/lib/errors";

// Server-side helpers for Server Actions. Not for Client Components: this
// imports lib/errors, which pulls in the Prisma client.

/**
 * Turns an expected failure into form feedback. Unexpected errors are logged
 * and replaced by a generic message, so internals never reach the browser.
 *
 * redirect() works by throwing. A redirect from requireUser() inside the try
 * is passed on by unstable_rethrow; still, keep the action's own redirect()
 * after the try, where it's obvious.
 */
export function toActionError(error: unknown): ActionState {
  unstable_rethrow(error);
  if (error instanceof z.ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(error);
    return { error: formErrors[0] ?? "Please fix the highlighted fields.", fieldErrors };
  }
  if (error instanceof AppError) {
    return { error: error.message };
  }
  console.error(error);
  return { error: "Something went wrong. Please try again." };
}

/**
 * toActionError plus the submitted values, for forms that should keep their input.
 * Password fields are never sent back: the user retypes them.
 */
export function formError(error: unknown, formData: FormData): ActionState {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$ACTION") && !/password/i.test(key)) values[key] = value;
  }
  return { ...toActionError(error), values };
}

// ---------- Reading FormData ----------
// Browsers send every field as a string. These helpers convert the common
// cases and leave the actual validation to the Zod schemas.

/** Trimmed text, or undefined when the field is missing or empty. */
export function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** A password exactly as typed: not trimmed, since spaces can be part of it. */
export function formPassword(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** A whole number, undefined when empty, NaN when not a number (Zod reports it). */
export function formInt(formData: FormData, key: string): number | undefined {
  const text = formText(formData, key);
  if (text === undefined) return undefined;
  return /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
}
