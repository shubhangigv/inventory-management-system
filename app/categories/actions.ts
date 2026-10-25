"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formError, formText, toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { createCategory, deleteCategory, updateCategory } from "@/lib/services/catalogue";

// TODO(auth): only admins should change categories.

function categoryFields(formData: FormData) {
  return { name: formText(formData, "name") ?? "", description: formText(formData, "description") };
}

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const category = await createCategory(categoryFields(formData));
    revalidateApp();
    return { ok: true, message: `Category "${category.name}" added.` };
  } catch (error) {
    return formError(error, formData);
  }
}

export async function updateCategoryAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateCategory(id, categoryFields(formData));
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/categories");
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  try {
    await deleteCategory(id);
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  return { ok: true };
}
