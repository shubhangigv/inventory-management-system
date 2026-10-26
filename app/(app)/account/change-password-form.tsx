"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { inputClass } from "@/app/components/ui";
import { initialActionState } from "@/lib/action-state";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} {...errorProps("currentPassword", errors.currentPassword)} />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword} hint="At least 8 characters">
        <input id="newPassword" name="newPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} {...errorProps("newPassword", errors.newPassword)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" className={inputClass} {...errorProps("confirmPassword", errors.confirmPassword)} />
      </Field>
      <div>
        <SubmitButton pendingText="Saving…">Change password</SubmitButton>
      </div>
    </form>
  );
}
