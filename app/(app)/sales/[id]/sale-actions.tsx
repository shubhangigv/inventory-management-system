"use client";

import { useActionState, useState } from "react";
import { Ban, Printer } from "lucide-react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { buttonClass, inputClass } from "@/app/components/ui";
import { initialActionState } from "@/lib/action-state";
import { cancelSaleAction } from "../actions";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
      <Printer className="size-4" aria-hidden /> Print
    </button>
  );
}

/** Cancelling asks for a reason, which is saved on the sale and in the stock history. */
export function CancelSaleForm({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelSaleAction.bind(null, saleId), initialActionState);
  const errors = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "self-start")}>
        <Ban className="size-4" aria-hidden /> Cancel sale
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <Field label="Reason for cancelling" htmlFor="reason" error={errors.reason}>
        <input id="reason" name="reason" required maxLength={500} autoFocus defaultValue={state.values?.reason} className={inputClass} {...errorProps("reason", errors.reason)} />
      </Field>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        The items go back into stock. The invoice is kept and marked as cancelled.
      </p>
      <div className="flex gap-2">
        <SubmitButton variant="danger" pendingText="Cancelling…">Cancel sale</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost")}>Keep sale</button>
      </div>
    </form>
  );
}
