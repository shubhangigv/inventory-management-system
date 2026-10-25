"use client";

import { useActionState } from "react";
import { errorProps, Field, FormAlert, SubmitButton } from "@/app/components/form";
import { ButtonLink, inputClass, textareaClass } from "@/app/components/ui";
import { initialActionState, type ActionState } from "@/lib/action-state";

type Option = { id: string; name: string };

export type ProductFormValues = {
  sku: string;
  name: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: string;
  categoryId: string;
  supplierId: string;
};

const emptyProduct: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  reorderLevel: "10",
  categoryId: "",
  supplierId: "",
};

/** Create form when `product` is missing, edit form otherwise. */
export function ProductForm({ action, categories, suppliers, product, cancelHref }: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  suppliers: Option[];
  product?: ProductFormValues;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const isNew = !product;
  const value = (name: keyof ProductFormValues | "openingStock") =>
    state.values?.[name] ?? (name === "openingStock" ? "0" : (product ?? emptyProduct)[name]);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <input id="name" name="name" required maxLength={200} defaultValue={value("name")} className={inputClass} {...errorProps("name", errors.name)} />
        </Field>
        <Field label="SKU" htmlFor="sku" error={errors.sku} hint="Unique code, saved in capitals. Letters, digits, . _ -">
          <input id="sku" name="sku" required maxLength={64} defaultValue={value("sku")} className={`${inputClass} font-mono uppercase`} {...errorProps("sku", errors.sku)} />
        </Field>
        <Field label="Selling price" htmlFor="sellingPrice" error={errors.sellingPrice} hint="Before tax">
          <input id="sellingPrice" name="sellingPrice" required inputMode="decimal" placeholder="0.00" defaultValue={value("sellingPrice")} className={inputClass} {...errorProps("sellingPrice", errors.sellingPrice)} />
        </Field>
        <Field label="Cost price" htmlFor="costPrice" error={errors.costPrice} hint="What you pay the supplier">
          <input id="costPrice" name="costPrice" required inputMode="decimal" placeholder="0.00" defaultValue={value("costPrice")} className={inputClass} {...errorProps("costPrice", errors.costPrice)} />
        </Field>
        <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
          <select id="categoryId" name="categoryId" defaultValue={value("categoryId")} className={inputClass}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supplier" htmlFor="supplierId" error={errors.supplierId}>
          <select id="supplierId" name="supplierId" defaultValue={value("supplierId")} className={inputClass}>
            <option value="">No supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </Field>
        {isNew && (
          <Field label="Opening stock" htmlFor="openingStock" error={errors.openingStock} hint="Units on hand now. Recorded in the stock history.">
            <input id="openingStock" name="openingStock" type="number" min={0} step={1} defaultValue={value("openingStock")} className={inputClass} {...errorProps("openingStock", errors.openingStock)} />
          </Field>
        )}
        <Field label="Reorder level" htmlFor="reorderLevel" error={errors.reorderLevel} hint="Shown as low stock at or below this number">
          <input id="reorderLevel" name="reorderLevel" type="number" min={0} step={1} required defaultValue={value("reorderLevel")} className={inputClass} {...errorProps("reorderLevel", errors.reorderLevel)} />
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description} className="sm:col-span-2">
          <textarea id="description" name="description" maxLength={2000} rows={3} defaultValue={value("description")} className={textareaClass} />
        </Field>
      </div>

      {!isNew && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Stock isn&apos;t edited here. Use <strong>Receive stock</strong> or <strong>Adjust stock</strong> on the
          product page so every change is recorded.
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">{isNew ? "Create product" : "Save changes"}</SubmitButton>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
