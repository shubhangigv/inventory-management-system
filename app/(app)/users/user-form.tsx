"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { ButtonLink, inputClass } from "@/app/components/ui";
import { initialActionState, type ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type UserFormValues = { name: string; email: string; role: "ADMIN" | "STAFF"; isActive: boolean };

/**
 * Without `user` it creates an account (with a first password); with `user` it
 * edits one. Admins can't change their own role or deactivate themselves, so
 * for their own account those inputs are locked (the service checks it too).
 */
export function UserForm({ action, user, isSelf = false, cancelHref }: {
  action: Action;
  user?: UserFormValues;
  isSelf?: boolean;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const values = state.ok ? undefined : state.values;
  const role = values?.role ?? user?.role ?? "STAFF";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Name" htmlFor="name" error={errors.name}>
        <input id="name" name="name" required maxLength={100} defaultValue={values?.name ?? user?.name} className={inputClass} {...errorProps("name", errors.name)} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email} hint="Used to log in">
        <input id="email" name="email" type="email" required maxLength={200} autoComplete="off" defaultValue={values?.email ?? user?.email} className={inputClass} {...errorProps("email", errors.email)} />
      </Field>
      <Field
        label="Role"
        htmlFor="role"
        error={errors.role}
        hint={isSelf ? "You can't change your own role." : "Staff sell and record stock. Admins also manage products, users and settings."}
      >
        <select id="role" name="role" defaultValue={role} disabled={isSelf} className={inputClass}>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        {/* Disabled inputs aren't submitted, so send the unchanged value. */}
        {isSelf && <input type="hidden" name="role" value={role} />}
      </Field>
      {user ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={values ? values.isActive === "on" : user.isActive}
            disabled={isSelf}
            className="mt-0.5 size-4"
          />
          {isSelf && <input type="hidden" name="isActive" value="on" />}
          <span>
            <span className="font-medium">Active</span>
            <span className="block text-zinc-500 dark:text-zinc-400">
              Inactive users can&apos;t log in and are logged out at once. Their sales stay in the history.
            </span>
          </span>
        </label>
      ) : (
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters. Share it with them privately.">
          <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} {...errorProps("password", errors.password)} />
        </Field>
      )}
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">{user ? "Save changes" : "Add user"}</SubmitButton>
        {cancelHref && (
          <ButtonLink href={cancelHref} variant="secondary">
            Cancel
          </ButtonLink>
        )}
      </div>
    </form>
  );
}

/** An admin sets a new password for another user. */
export function ResetPasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters">
        <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} {...errorProps("password", errors.password)} />
      </Field>
      <div>
        <SubmitButton variant="secondary" pendingText="Saving…">Set password</SubmitButton>
      </div>
    </form>
  );
}
