"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { getSession } from "@/lib/auth";
import { formPassword, toActionError } from "@/lib/form-actions";
import { changePassword } from "@/lib/services/users";

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    await changePassword(session.user.id, session.sessionId, {
      currentPassword: formPassword(formData, "currentPassword"),
      newPassword: formPassword(formData, "newPassword"),
      confirmPassword: formPassword(formData, "confirmPassword"),
    });
  } catch (error) {
    // No values sent back: every field here is a password.
    return toActionError(error);
  }
  return { ok: true, message: "Password changed. Any other browsers you were logged in on have been logged out." };
}
