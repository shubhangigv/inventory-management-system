"use client";

import { useActionState, useState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { cx, inputClass } from "@/app/components/ui";
import { initialActionState } from "@/lib/action-state";
import { recordStockAction } from "./actions";

type Mode = "receive" | "adjust";

type ProductOption = { id: string; sku: string; name: string; stockQuantity: number };

/**
 * Receive goods or correct the stock count. Pass `productId` for a single
 * product's page, or `products` to let the user pick one.
 */
export function StockForm({ productId, products }: { productId?: string; products?: ProductOption[] }) {
  const [state, formAction] = useActionState(recordStockAction, initialActionState);
  const [mode, setMode] = useState<Mode>((state.values?.mode as Mode) ?? "receive");
  const errors = state.fieldErrors ?? {};
  // A new key after each success clears the inputs; after a failure they keep their values.
  const values = state.ok ? {} : (state.values ?? {});

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      {/* Buttons + hidden input rather than radios, so the form reset after each save can't change the mode. */}
      <input type="hidden" name="mode" value={mode} />
      <div role="group" aria-label="Type of change" className="grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
        {(["receive", "adjust"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={cx(
              "rounded px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-white shadow-xs dark:bg-zinc-950" : "text-zinc-600 dark:text-zinc-400",
            )}
          >
            {option === "receive" ? "Receive stock" : "Adjust stock"}
          </button>
        ))}
      </div>

      <FormAlert state={state} />

      {productId ? (
        <input type="hidden" name="productId" value={productId} />
      ) : (
        <Field label="Product" htmlFor="stock-productId" error={errors.productId}>
          <select id="stock-productId" name="productId" required defaultValue={values.productId ?? ""} className={inputClass}>
            <option value="" disabled>
              Choose a product…
            </option>
            {products?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku}) · {product.stockQuantity} in stock
              </option>
            ))}
          </select>
        </Field>
      )}

      {mode === "receive" ? (
        <Field label="Quantity received" htmlFor="stock-quantity" error={errors.quantity}>
          <input key={`r-${state.message}`} id="stock-quantity" name="quantity" type="number" min={1} step={1} required defaultValue={values.quantity} className={inputClass} {...errorProps("stock-quantity", errors.quantity)} />
        </Field>
      ) : (
        <Field label="Change" htmlFor="stock-quantity" error={errors.quantityChange} hint="Negative to remove (e.g. -2 damaged), positive to add">
          <input key={`a-${state.message}`} id="stock-quantity" name="quantity" type="number" step={1} required defaultValue={values.quantity} className={inputClass} {...errorProps("stock-quantity", errors.quantityChange)} />
        </Field>
      )}

      <Field
        label={mode === "receive" ? "Note (optional)" : "Reason"}
        htmlFor="stock-reason"
        error={errors.reason}
        hint={mode === "receive" ? "e.g. supplier invoice number" : "Required: stock count, damage, loss…"}
      >
        <input key={`n-${state.message}`} id="stock-reason" name="reason" maxLength={500} required={mode === "adjust"} defaultValue={values.reason} className={inputClass} {...errorProps("stock-reason", errors.reason)} />
      </Field>

      <SubmitButton pendingText="Saving…">{mode === "receive" ? "Add to stock" : "Save adjustment"}</SubmitButton>
    </form>
  );
}
