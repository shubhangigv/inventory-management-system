import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { AppError } from "@/lib/errors";

// Server-side helpers for Server Actions. Not for Client Components: this
// imports lib/errors, which pulls in the Prisma client.

/**
 * Turns an expected failure into form feedback. Unexpected errors are logged
 * and replaced by a generic message, so internals never reach the browser.
 *
 * Never wrap redirect() in a try that calls this: redirect works by throwing.
 */
export function toActionError(error: unknown): ActionState {
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

/** toActionError plus the submitted values, for forms that should keep their input. */
export function formError(error: unknown, formData: FormData): ActionState {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
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

/** A whole number, undefined when empty, NaN when not a number (Zod reports it). */
export function formInt(formData: FormData, key: string): number | undefined {
  const text = formText(formData, key);
  if (text === undefined) return undefined;
  return /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
}
