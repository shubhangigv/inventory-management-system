"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { formError, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { cancelSale, createSale } from "@/lib/services/sales";
import type { CreateSaleInput } from "@/lib/validation/sales";

// Any logged-in user (staff or admin) can sell and cancel. The user is saved on
// the sale and its stock movements.

/**
 * Called by the point-of-sale screen with the cart as plain data. Only product
 * IDs and quantities are trusted; prices and totals come from the database.
 */
export async function createSaleAction(input: CreateSaleInput): Promise<ActionState> {
  let saleId: string;
  try {
    const { id: userId } = await requireUser();
    ({ id: saleId } = await createSale(input, { userId }));
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
    const { id: userId } = await requireUser();
    await cancelSale({ saleId, reason: formText(formData, "reason") ?? "" }, { userId });
  } catch (error) {
    return formError(error, formData);
  }
  // The refreshed invoice shows the "Cancelled" banner and no longer renders this form.
  revalidateApp();
  return { ok: true };
}
