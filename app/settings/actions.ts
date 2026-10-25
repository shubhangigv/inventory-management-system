"use server";

import type { ActionState } from "@/lib/action-state";
import { formError, formText } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { updateBusinessSettings } from "@/lib/services/settings";

// TODO(auth): only admins should change settings.

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateBusinessSettings({
      businessName: formText(formData, "businessName") ?? "",
      address: formText(formData, "address"),
      phone: formText(formData, "phone"),
      email: formText(formData, "email"),
      currencyCode: formText(formData, "currencyCode") ?? "",
      taxRate: formText(formData, "taxRate") ?? "",
      invoicePrefix: formText(formData, "invoicePrefix") ?? "",
    });
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  return { ok: true, message: "Settings saved." };
}
