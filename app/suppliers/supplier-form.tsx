"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { ButtonLink, inputClass, textareaClass } from "@/app/components/ui";
import { initialActionState, type ActionState } from "@/lib/action-state";

export type SupplierFormValues = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
};

export function SupplierForm({ action, supplier }: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  supplier?: SupplierFormValues;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const value = (name: keyof SupplierFormValues) => state.values?.[name] ?? supplier?.[name];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" htmlFor="name" error={errors.name}>
          <input id="name" name="name" required maxLength={200} defaultValue={value("name")} className={inputClass} {...errorProps("name", errors.name)} />
        </Field>
        <Field label="Contact person" htmlFor="contactName" error={errors.contactName}>
          <input id="contactName" name="contactName" maxLength={200} defaultValue={value("contactName")} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" maxLength={200} defaultValue={value("email")} className={inputClass} {...errorProps("email", errors.email)} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <input id="phone" name="phone" type="tel" maxLength={50} defaultValue={value("phone")} className={inputClass} />
        </Field>
        <Field label="Address" htmlFor="address" error={errors.address} className="sm:col-span-2">
          <textarea id="address" name="address" rows={3} maxLength={500} defaultValue={value("address")} className={textareaClass} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">{supplier ? "Save changes" : "Add supplier"}</SubmitButton>
        <ButtonLink href="/suppliers" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
