"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { PaymentMethod } from "@/app/generated/prisma/enums";
import { FormAlert } from "@/app/components/form";
import { buttonClass, Card, cx, EmptyState, inputClass } from "@/app/components/ui";
import type { ActionState } from "@/lib/action-state";
import { fromCents, previewSaleTotals, toCents } from "@/lib/cents";
import { formatEnum, formatMoney } from "@/lib/format";
import { createSaleAction } from "../actions";

export type SellableProduct = { id: string; sku: string; name: string; price: string; stock: number };

type CartLine = { product: SellableProduct; quantity: number };
type PaymentRow = { key: number; method: PaymentMethod; amount: string; reference: string };

const paymentMethods = Object.values(PaymentMethod);

/**
 * The checkout screen. Everything here is a preview: the server reloads the
 * products, recalculates the totals and rejects the sale if anything changed.
 */
export function PointOfSale({ products, taxRate, currencyCode }: {
  products: SellableProduct[];
  taxRate: string;
  currencyCode: string;
}) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  // With one payment and no amount typed, the payment is simply the total.
  const [payments, setPayments] = useState<PaymentRow[]>([{ key: 0, method: "CASH", amount: "", reference: "" }]);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const money = (cents: number) => formatMoney(fromCents(cents), currencyCode);

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) => product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query),
    );
  }, [products, search]);

  const discountCents = discount.trim() === "" ? 0 : toCents(discount);
  const totals = previewSaleTotals(
    cart.map((line) => ({ unitPrice: line.product.price, quantity: line.quantity })),
    discountCents ?? 0,
    taxRate,
  );

  const autoAmount = payments.length === 1 && payments[0].amount.trim() === "";
  const paymentCents = payments.map((payment, index) =>
    autoAmount && index === 0 ? totals.total : toCents(payment.amount),
  );
  const paidCents = paymentCents.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
  const remaining = totals.total - paidCents;

  const problems = [
    cart.length === 0 && "Add at least one product.",
    discountCents === null && "Enter the discount like 50 or 49.50.",
    discountCents !== null && discountCents > totals.subtotal && "Discount can't be more than the subtotal.",
    paymentCents.some((cents) => cents === null || cents === 0) && "Each payment needs an amount.",
    cart.length > 0 && remaining !== 0 && `Payments must add up to the total (${remaining > 0 ? `${money(remaining)} still due` : `${money(-remaining)} too much`}).`,
  ].filter((problem): problem is string => typeof problem === "string");

  function addToCart(product: SellableProduct) {
    setState({});
    setCart((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (!existing) return product.stock > 0 ? [...lines, { product, quantity: 1 }] : lines;
      return lines.map((line) =>
        line === existing ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line,
      );
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setCart((lines) =>
      lines.flatMap((line) => {
        if (line.product.id !== productId) return [line];
        const clamped = Math.min(Math.max(0, Math.floor(quantity) || 0), line.product.stock);
        return clamped === 0 ? [] : [{ ...line, quantity: clamped }];
      }),
    );
  }

  function updatePayment(key: number, change: Partial<PaymentRow>) {
    setPayments((rows) => rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  function addPayment() {
    setPayments((rows) => {
      // Splitting: fix the first payment at the full total, then the cashier lowers it.
      const fixed = rows.length === 1 && rows[0].amount.trim() === "" ? [{ ...rows[0], amount: fromCents(totals.total) }] : rows;
      return [...fixed, { key: Math.max(...rows.map((row) => row.key)) + 1, method: "UPI", amount: "", reference: "" }];
    });
  }

  function completeSale() {
    startTransition(async () => {
      const result = await createSaleAction({
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        payments: payments.map((payment, index) => ({
          method: payment.method,
          amount: fromCents(paymentCents[index] ?? 0),
          reference: payment.reference,
        })),
        discountAmount: fromCents(discountCents ?? 0),
        customerName,
        notes,
      });
      // On success the action redirects to the invoice, so we only get here on failure.
      setState(result);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <label htmlFor="pos-search" className="sr-only">Search products</label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              id="pos-search"
              type="search"
              autoFocus
              autoComplete="off"
              placeholder="Search by name or scan SKU, then press Enter"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                // A barcode scanner types the SKU and presses Enter: prefer an exact SKU match.
                const exact = products.find((product) => product.sku.toLowerCase() === search.trim().toLowerCase());
                const pick = exact ?? (matches.length === 1 ? matches[0] : undefined);
                if (pick) {
                  addToCart(pick);
                  setSearch("");
                }
              }}
              className={cx(inputClass, "pl-9")}
            />
          </div>
        </div>
        {matches.length === 0 ? (
          <EmptyState title="No matching products">Only active products are listed here.</EmptyState>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {matches.map((product) => {
              const inCart = cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
              const available = product.stock - inCart;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={available <= 0}
                    onClick={() => addToCart(product)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="font-mono text-xs text-zinc-500">{product.sku}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium tabular-nums">{formatMoney(product.price, currencyCode)}</span>
                      <span className={cx("text-xs", available <= 0 ? "text-red-600" : "text-zinc-500")}>
                        {product.stock === 0 ? "Out of stock" : `${available} available`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card title="Cart" actions={cart.length > 0 && (
          <button type="button" onClick={() => setCart([])} className="text-sm text-zinc-500 hover:underline">Clear</button>
        )}>
          {cart.length === 0 ? (
            <EmptyState title="Cart is empty">Pick products from the list.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {cart.map((line) => (
                <li key={line.product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.product.name}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      {formatMoney(line.product.price, currencyCode)} × {line.quantity} = {money((toCents(line.product.price) ?? 0) * line.quantity)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label={`One less ${line.product.name}`} onClick={() => setQuantity(line.product.id, line.quantity - 1)} className={buttonClass("ghost", "size-8 px-0")}>
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={line.product.stock}
                      aria-label={`Quantity of ${line.product.name}`}
                      value={line.quantity}
                      onChange={(event) => setQuantity(line.product.id, Number(event.target.value))}
                      className={cx(inputClass, "w-16 px-2 text-center")}
                    />
                    <button type="button" aria-label={`One more ${line.product.name}`} disabled={line.quantity >= line.product.stock} onClick={() => setQuantity(line.product.id, line.quantity + 1)} className={buttonClass("ghost", "size-8 px-0")}>
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => setQuantity(line.product.id, 0)} className={buttonClass("ghost", "size-8 px-0")}>
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <dl className="flex flex-col gap-1.5 border-t border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <Row label="Subtotal" value={money(totals.subtotal)} />
            <div className="flex items-center justify-between gap-4">
              <dt><label htmlFor="pos-discount">Discount</label></dt>
              <dd>
                <input id="pos-discount" inputMode="decimal" placeholder="0.00" value={discount} onChange={(event) => setDiscount(event.target.value)} className={cx(inputClass, "h-8 w-28 text-right")} />
              </dd>
            </div>
            <Row label={`Tax (${taxRate}%)`} value={money(totals.tax)} />
            <Row label="Total" value={money(totals.total)} strong />
          </dl>
        </Card>

        <Card title="Payment" actions={
          <button type="button" onClick={addPayment} className="text-sm text-zinc-500 hover:underline">Split payment</button>
        }>
          <div className="flex flex-col gap-3 p-4">
            {payments.map((payment, index) => (
              <div key={payment.key} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`method-${payment.key}`}>Method</label>
                  <select id={`method-${payment.key}`} value={payment.method} onChange={(event) => updatePayment(payment.key, { method: event.target.value as PaymentMethod })} className={inputClass}>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{formatEnum(method)}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`amount-${payment.key}`}>Amount</label>
                  <input
                    id={`amount-${payment.key}`}
                    inputMode="decimal"
                    placeholder={autoAmount ? fromCents(totals.total) : "0.00"}
                    value={payment.amount}
                    onChange={(event) => updatePayment(payment.key, { amount: event.target.value })}
                    className={cx(inputClass, "w-32 text-right")}
                  />
                  {payments.length > 1 && (
                    <button type="button" aria-label="Remove payment" onClick={() => setPayments((rows) => rows.filter((row) => row.key !== payment.key))} className={buttonClass("ghost", "px-2")}>
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                {payment.method !== "CASH" && (
                  <input
                    aria-label="Reference"
                    placeholder="Reference / transaction ID (optional)"
                    maxLength={100}
                    value={payment.reference}
                    onChange={(event) => updatePayment(payment.key, { reference: event.target.value })}
                    className={inputClass}
                  />
                )}
                {payments.length > 1 && remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => updatePayment(payment.key, { amount: fromCents((paymentCents[index] ?? 0) + remaining) })}
                    className="self-start text-xs text-zinc-500 hover:underline"
                  >
                    Add remaining {money(remaining)} here
                  </button>
                )}
              </div>
            ))}

            <label className="sr-only" htmlFor="pos-customer">Customer name</label>
            <input id="pos-customer" placeholder="Customer name (optional)" maxLength={200} value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={inputClass} />
            <label className="sr-only" htmlFor="pos-notes">Notes</label>
            <input id="pos-notes" placeholder="Notes (optional)" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />

            <FormAlert state={state} />
            {cart.length > 0 && problems.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">{problems[0]}</p>
            )}
            <button type="button" disabled={pending || problems.length > 0} onClick={completeSale} className={buttonClass("primary", "h-11 text-base")}>
              {pending ? "Saving sale…" : `Complete sale · ${money(totals.total)}`}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-4", strong && "border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-800")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
