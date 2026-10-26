"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import { formError, formPassword, formText } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { createUser, resetPassword, updateUser } from "@/lib/services/users";
import type { CreateUserInput } from "@/lib/validation/users";

// Admins only. Server Actions can be called directly over HTTP, so each one
// checks the user itself.

// Zod checks the role; the cast only satisfies TypeScript.
const formRole = (formData: FormData) => (formText(formData, "role") ?? "") as CreateUserInput["role"];

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const user = await createUser({
      name: formText(formData, "name") ?? "",
      email: formText(formData, "email") ?? "",
      role: formRole(formData),
      password: formPassword(formData, "password"),
    });
    revalidateApp();
    return { ok: true, message: `${user.name} can now log in as ${user.email}.` };
  } catch (error) {
    return formError(error, formData);
  }
}

export async function updateUserAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    await updateUser(
      id,
      {
        name: formText(formData, "name") ?? "",
        email: formText(formData, "email") ?? "",
        role: formRole(formData),
        isActive: formData.get("isActive") === "on",
      },
      { userId: admin.id },
    );
  } catch (error) {
    return formError(error, formData);
  }
  revalidateApp();
  redirect("/users");
}

export async function resetPasswordAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    await resetPassword({ userId, password: formPassword(formData, "password") });
  } catch (error) {
    return formError(error, formData);
  }
  return { ok: true, message: "Password changed. They have been logged out everywhere and must use the new one." };
}
