"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { inputClass } from "@/app/components/ui";
import { initialActionState } from "@/lib/action-state";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          defaultValue={state.values?.email}
          className={inputClass}
          {...errorProps("email", errors.email)}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          {...errorProps("password", errors.password)}
        />
      </Field>
      <SubmitButton pendingText="Logging in…" className="mt-2">
        Log in
      </SubmitButton>
    </form>
  );
}
