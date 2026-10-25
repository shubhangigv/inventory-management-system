"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formError, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/services/catalogue";

// TODO(auth): only admins should change suppliers.

function supplierFields(formData: FormData) {
  return {
    name: formText(formData, "name") ?? "",
    contactName: formText(formData, "contactName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    address: formText(formData, "address"),
  };
}

export async function createSupplierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createSupplier(supplierFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/suppliers");
}

export async function updateSupplierAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateSupplier(id, supplierFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/suppliers");
}

export async function deleteSupplierAction(id: string): Promise<ActionState> {
  try {
    await deleteSupplier(id);
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  return { ok: true };
}
