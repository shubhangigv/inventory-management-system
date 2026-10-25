"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formError, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { cancelSale, createSale } from "@/lib/services/sales";
import type { CreateSaleInput } from "@/lib/validation/sales";

// TODO(auth): check the session and pass { userId } to the services.

/**
 * Called by the point-of-sale screen with the cart as plain data. Only product
 * IDs and quantities are trusted; prices and totals come from the database.
 */
export async function createSaleAction(input: CreateSaleInput): Promise<ActionState> {
  let saleId: string;
  try {
    ({ id: saleId } = await createSale(input));
  } catch (error) {
    // The cart has no inputs to put field errors next to, so show the first one as the message.
    const state = toActionError(error);
    const firstFieldError = Object.values(state.fieldErrors ?? {}).flat()[0];
    return firstFieldError ? { error: firstFieldError } : state;
  }
  revalidateApp();
  redirect(`/sales/${saleId}`);
}

export async function cancelSaleAction(saleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await cancelSale({ saleId, reason: formText(formData, "reason") ?? "" });
  } catch (error) {
    return formError(error, formData);
  }
  // The refreshed invoice shows the "Cancelled" banner and no longer renders this form.
  revalidateApp();
  return { ok: true };
}
