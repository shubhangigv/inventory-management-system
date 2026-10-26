"use server";

import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { formError, formInt, formText } from "@/lib/form-actions";
import { formatNumber } from "@/lib/format";
import { revalidateApp } from "@/lib/revalidate";
import { adjustStock, receiveStock } from "@/lib/services/inventory";

// Any logged-in user (staff or admin). The user is saved on the movement, so the
// stock history shows who made each change.

/** One form for both kinds of change; "mode" says which. */
export async function recordStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = formText(formData, "productId") ?? "";
  const reason = formText(formData, "reason");

  try {
    const { id: userId } = await requireUser();
    const movement =
      formText(formData, "mode") === "adjust"
        ? await adjustStock({ productId, quantityChange: formInt(formData, "quantity") ?? Number.NaN, reason: reason ?? "" }, { userId })
        : await receiveStock({ productId, quantity: formInt(formData, "quantity") ?? Number.NaN, reason }, { userId });
    revalidateApp();
    const change = movement.quantityChange > 0 ? `+${movement.quantityChange}` : String(movement.quantityChange);
    return { ok: true, message: `Stock updated (${change}). New balance: ${formatNumber(movement.stockAfter)}.` };
  } catch (error) {
    return formError(error, formData);
  }
}
