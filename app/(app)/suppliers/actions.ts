"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import { formError, formInt, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/services/catalogue";

// Admins only. Server Actions can be called directly over HTTP, so each one
// checks the user itself; hiding the buttons from staff isn't enough.

function supplierFields(formData: FormData) {
  return {
    name: formText(formData, "name") ?? "",
    contactName: formText(formData, "contactName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    address: formText(formData, "address"),
    leadTimeDays: formInt(formData, "leadTimeDays"),
    orderCycleDays: formInt(formData, "orderCycleDays"),
  };
}

export async function createSupplierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    await createSupplier(supplierFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/suppliers");
}

export async function updateSupplierAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    await updateSupplier(id, supplierFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/suppliers");
}

export async function deleteSupplierAction(id: string): Promise<ActionState> {
  try {
    await requireAdmin();
    await deleteSupplier(id);
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  return { ok: true };
}
