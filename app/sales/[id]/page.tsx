import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, Card, PageHeader, Skeleton, Table, Td, Th } from "@/app/components/ui";
import { formatDateTime, formatEnum, formatMoney } from "@/lib/format";
import type { Decimal } from "@/lib/money";
import { getSale } from "@/lib/services/sales";
import { readBusinessSettings } from "@/lib/services/settings";
import { CancelSaleForm, PrintButton } from "./sale-actions";

export const metadata = { title: "Invoice" };

export default function SalePage({ params }: PageProps<"/sales/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, settings] = await Promise.all([getSale(id), readBusinessSettings()]);
  if (!sale) notFound();

  const money = (value: Decimal) => formatMoney(value, settings.currencyCode);
  const cancelled = sale.status === "CANCELLED";

  return (
    <>
      <PageHeader
        back={{ href: "/sales", label: "Sales" }}
        title={<span className="font-mono">{sale.invoiceNumber}</span>}
        description={formatDateTime(sale.soldAt)}
        actions={
          <>
            <PrintButton />
            <ButtonLink href="/sales/new">
              <Plus className="size-4" aria-hidden /> New sale
            </ButtonLink>
          </>
        }
      />

      {cancelled && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Cancelled{sale.cancelledAt && ` on ${formatDateTime(sale.cancelledAt)}`}</p>
          {sale.cancelReason && <p>Reason: {sale.cancelReason}</p>}
        </div>
      )}

      <Card>
        <div className="flex flex-col justify-between gap-6 border-b border-zinc-200 p-6 sm:flex-row dark:border-zinc-800">
          <div className="text-sm">
            <p className="text-lg font-semibold">{settings.businessName}</p>
            {settings.address && <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">{settings.address}</p>}
            {[settings.phone, settings.email].filter(Boolean).map((line) => (
              <p key={line} className="text-zinc-600 dark:text-zinc-400">{line}</p>
            ))}
          </div>
          <div className="text-sm sm:text-right">
            <p className="flex items-center gap-2 sm:justify-end">
              <span className="font-semibold">Invoice {sale.invoiceNumber}</span>
              <Badge tone={cancelled ? "red" : "green"}>{formatEnum(sale.status)}</Badge>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">{formatDateTime(sale.soldAt)}</p>
            <p className="mt-2">
              <span className="text-zinc-500">Customer: </span>
              {sale.customerName ?? "Walk-in customer"}
            </p>
            {sale.createdBy && <p className="text-zinc-500">Served by {sale.createdBy.name}</p>}
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Price</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <span className="font-medium">{item.productName}</span>
                  <div className="font-mono text-xs text-zinc-500">{item.productSku}</div>
                </Td>
                <Td align="right">{item.quantity}</Td>
                <Td align="right">{money(item.unitPrice)}</Td>
                <Td align="right">{money(item.unitPrice.times(item.quantity))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:justify-between">
          <div className="text-sm">
            <p className="mb-1 font-medium">Payments</p>
            <ul className="text-zinc-600 dark:text-zinc-400">
              {sale.payments.map((payment) => (
                <li key={payment.id}>
                  {formatEnum(payment.method)}: {money(payment.amount)}
                  {payment.reference && <span className="font-mono text-xs"> · {payment.reference}</span>}
                </li>
              ))}
            </ul>
            {sale.notes && <p className="mt-3 text-zinc-600 dark:text-zinc-400">Note: {sale.notes}</p>}
          </div>
          <dl className="grid min-w-64 grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
            <dt>Subtotal</dt>
            <dd className="text-right">{money(sale.subtotal)}</dd>
            {!sale.discountAmount.isZero() && (
              <>
                <dt>Discount</dt>
                <dd className="text-right">−{money(sale.discountAmount)}</dd>
              </>
            )}
            <dt>Tax</dt>
            <dd className="text-right">{money(sale.taxAmount)}</dd>
            <dt className="border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-800">Total</dt>
            <dd className="border-t border-zinc-200 pt-2 text-right text-base font-semibold dark:border-zinc-800">
              {money(sale.totalAmount)}
            </dd>
          </dl>
        </div>
      </Card>

      {!cancelled && (
        <Card title="Cancel this sale" className="print-hidden">
          <div className="flex flex-col p-4">
            <CancelSaleForm saleId={sale.id} />
          </div>
        </Card>
      )}
    </>
  );
}
