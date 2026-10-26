"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { ButtonLink, inputClass } from "@/app/components/ui";
import { initialActionState, type ActionState } from "@/lib/action-state";

export function CategoryForm({ action, category, cancelHref }: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  category?: { name: string; description: string };
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  // After a successful create the form resets to empty; after a failure it keeps what was typed.
  const values = state.ok ? undefined : state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Name" htmlFor="name" error={errors.name}>
        <input id="name" name="name" required maxLength={100} defaultValue={values?.name ?? category?.name} className={inputClass} {...errorProps("name", errors.name)} />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={errors.description}>
        <input id="description" name="description" maxLength={500} defaultValue={values?.description ?? category?.description} className={inputClass} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">{category ? "Save changes" : "Add category"}</SubmitButton>
        {cancelHref && (
          <ButtonLink href={cancelHref} variant="secondary">
            Cancel
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
