"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { inputClass, textareaClass } from "@/app/components/ui";
import { initialActionState } from "@/lib/action-state";
import { updateSettingsAction } from "./actions";

export type SettingsFormValues = {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: string;
  taxRate: string;
  invoicePrefix: string;
};

export function SettingsForm({ settings, nextInvoice }: { settings: SettingsFormValues; nextInvoice: number }) {
  const [state, formAction] = useActionState(updateSettingsAction, initialActionState);
  const errors = state.fieldErrors ?? {};
  // On failure keep what was typed; on success the page reloads with the saved values.
  const value = (name: keyof SettingsFormValues) => (state.ok ? undefined : state.values?.[name]) ?? settings[name];
  const prefix = value("invoicePrefix").toUpperCase() || "INV";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="businessName" error={errors.businessName} hint="Printed on invoices">
          <input id="businessName" name="businessName" required maxLength={200} defaultValue={value("businessName")} className={inputClass} {...errorProps("businessName", errors.businessName)} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" maxLength={200} defaultValue={value("email")} className={inputClass} {...errorProps("email", errors.email)} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <input id="phone" name="phone" type="tel" maxLength={50} defaultValue={value("phone")} className={inputClass} />
        </Field>
        <Field label="Address" htmlFor="address" error={errors.address} className="sm:row-span-2">
          <textarea id="address" name="address" rows={4} maxLength={500} defaultValue={value("address")} className={textareaClass} />
        </Field>
        <Field label="Currency" htmlFor="currencyCode" error={errors.currencyCode} hint="3-letter code, e.g. INR, USD, EUR">
          <input id="currencyCode" name="currencyCode" required maxLength={3} defaultValue={value("currencyCode")} className={`${inputClass} uppercase`} {...errorProps("currencyCode", errors.currencyCode)} />
        </Field>
        <Field label="Tax rate (%)" htmlFor="taxRate" error={errors.taxRate} hint="Added on top of prices. Applies to new sales only.">
          <input id="taxRate" name="taxRate" required inputMode="decimal" defaultValue={value("taxRate")} className={inputClass} {...errorProps("taxRate", errors.taxRate)} />
        </Field>
        <Field
          label="Invoice prefix"
          htmlFor="invoicePrefix"
          error={errors.invoicePrefix}
          hint={`Next invoice: ${prefix}-${String(nextInvoice).padStart(6, "0")}`}
        >
          <input id="invoicePrefix" name="invoicePrefix" required maxLength={10} defaultValue={value("invoicePrefix")} className={`${inputClass} uppercase`} {...errorProps("invoicePrefix", errors.invoicePrefix)} />
        </Field>
      </div>
      <div>
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
