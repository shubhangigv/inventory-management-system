"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formError, formInt, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import {
  createProduct,
  deleteProduct,
  setProductActive,
  updateProduct,
} from "@/lib/services/products";

// TODO(auth): once login exists, check the session here and pass { userId }
// to the services. Server Actions can be called directly over HTTP.

function productFields(formData: FormData) {
  return {
    sku: formText(formData, "sku") ?? "",
    name: formText(formData, "name") ?? "",
    description: formText(formData, "description"),
    costPrice: formText(formData, "costPrice") ?? "",
    sellingPrice: formText(formData, "sellingPrice") ?? "",
    reorderLevel: formInt(formData, "reorderLevel") ?? 0,
    categoryId: formText(formData, "categoryId"),
    supplierId: formText(formData, "supplierId"),
  };
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    ({ id } = await createProduct({ ...productFields(formData), openingStock: formInt(formData, "openingStock") ?? 0 }));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect(`/products/${id}`);
}

export async function updateProductAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateProduct(id, productFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect(`/products/${id}`);
}

export async function setProductActiveAction(id: string, isActive: boolean): Promise<ActionState> {
  try {
    await setProductActive(id, isActive);
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  return { ok: true, message: isActive ? "Product is active again." : "Product deactivated." };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  try {
    await deleteProduct(id);
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  redirect("/products");
}
