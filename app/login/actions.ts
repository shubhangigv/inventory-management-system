"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { endSession, startSession } from "@/lib/auth";
import { formPassword, formText, toActionError } from "@/lib/form-actions";
import { authenticate } from "@/lib/services/users";

/**
 * Only same-site paths are allowed after login. Otherwise a link like
 * /login?next=https://evil.example would send users to another site
 * straight after they typed their password (an "open redirect").
 */
function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value.startsWith("/login") ? "/" : value;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = formText(formData, "email") ?? "";
  try {
    const user = await authenticate({ email, password: formPassword(formData, "password") });
    await startSession(user.id);
  } catch (error) {
    // Send back the email only: a password never goes back to the browser.
    return { ...toActionError(error), values: { email } };
  }
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
