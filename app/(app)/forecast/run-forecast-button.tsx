"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { FormAlert, SubmitButton } from "@/app/components/form";
import { initialActionState } from "@/lib/action-state";
import { runForecastAction } from "./actions";

export function RunForecastButton() {
  const [state, formAction] = useActionState(runForecastAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <SubmitButton pendingText="Training model…">
        <RefreshCw className="size-4" aria-hidden /> Run forecast
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}
