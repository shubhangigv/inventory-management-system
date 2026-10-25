"use client";

import { useActionState } from "react";
import { Trash } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { ConfirmSubmitButton } from "./form";

/** Icon button that confirms, runs a delete action and shows its error inline. */
export function DeleteButton({ action, confirmMessage, label }: {
  action: () => Promise<ActionState>;
  confirmMessage: string;
  label: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {state.error && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
      <ConfirmSubmitButton variant="ghost" className="px-2" confirmMessage={confirmMessage} aria-label={label} title={label}>
        <Trash className="size-4" aria-hidden />
      </ConfirmSubmitButton>
    </form>
  );
}
