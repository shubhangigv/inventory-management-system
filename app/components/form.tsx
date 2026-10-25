"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { buttonClass, cx } from "./ui";

/** Label + input + error text. The input is passed as children. */
export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error?.length ? (
        <p id={`${htmlFor}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error[0]}
        </p>
      ) : (
        hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

/** aria-* props that link an input to its Field error. */
export function errorProps(id: string, error?: string[]) {
  return error?.length ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
}

/** Disables itself while the surrounding form's action is running. */
export function SubmitButton({ children, pendingText, variant, className, ...props }: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: Parameters<typeof buttonClass>[0];
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)} {...props}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Form-level error or success message from a Server Action. */
export function FormAlert({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
        {state.message}
      </p>
    );
  }
  return null;
}

/** A submit button that asks for confirmation first (for destructive actions). */
export function ConfirmSubmitButton({ confirmMessage, ...props }: ComponentProps<typeof SubmitButton> & {
  confirmMessage: string;
}) {
  return (
    <SubmitButton
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    />
  );
}
