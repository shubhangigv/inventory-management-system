import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { SaleStatus } from "@/app/generated/prisma/enums";
import { Pagination } from "@/app/components/pagination";
import {
  Badge,
  ButtonLink,
  buttonClass,
  Card,
  EmptyState,
  inputClass,
  PageHeader,
  Table,
  TableSkeleton,
  Td,
  Th,
} from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatEnum, formatMoney } from "@/lib/format";
import { listSales } from "@/lib/services/sales";
import { readBusinessSettings } from "@/lib/services/settings";
import { dateParam, enumParam, pageParam, param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Sales" };

const DAY_MS = 24 * 60 * 60 * 1000;

export default function SalesPage({ searchParams }: PageProps<"/sales">) {
  return (
    <>
      <PageHeader
        title="Sales"
        description="Every invoice. Cancelled sales stay here for the record."
        actions={
          <ButtonLink href="/sales/new">
            <Plus className="size-4" aria-hidden /> New sale
          </ButtonLink>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton rows={10} />}>
          <SalesTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function SalesTable({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const params = await searchParams;
  const filters = {
    q: param(params, "q"),
    status: enumParam(params, "status", Object.values(SaleStatus)),
    from: param(params, "from"),
    to: param(params, "to"),
  };
  const from = dateParam(params, "from");
  const to = dateParam(params, "to");
  const [sales, settings] = await Promise.all([
    listSales({
      query: filters.q,
      status: filters.status,
      from,
      // "to" is inclusive in the form, so search until the start of the next day.
      to: to && new Date(to.getTime() + DAY_MS),
      page: pageParam(params),
    }),
    readBusinessSettings(),
  ]);

  return (
    <>
      <Form action="" className="flex flex-col gap-2 border-b border-zinc-200 p-4 lg:flex-row dark:border-zinc-800">
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" type="search" placeholder="Invoice number or customer" defaultValue={filters.q} className={inputClass} />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className={`${inputClass} lg:w-40`}>
          <option value="">Any status</option>
          {Object.values(SaleStatus).map((status) => (
            <option key={status} value={status}>{formatEnum(status)}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className={`${inputClass} lg:w-40`} />
          <span className="text-sm text-zinc-500">to</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className={`${inputClass} lg:w-40`} />
        </div>
        <button type="submit" className={buttonClass("secondary")}>
          <Search className="size-4" aria-hidden /> Filter
        </button>
      </Form>

      {sales.rows.length === 0 ? (
        <EmptyState title="No sales found">
          {Object.values(filters).some(Boolean) ? "Try different filters." : <Link href="/sales/new" className="underline">Record your first sale</Link>}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Date</Th>
              <Th>Customer</Th>
              <Th>Paid by</Th>
              <Th align="right">Total</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sales.rows.map((sale) => (
              <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <Td>
                  <Link href={`/sales/${sale.id}`} className="font-mono font-medium hover:underline">{sale.invoiceNumber}</Link>
                  <div className="text-xs text-zinc-500">{sale._count.items} {sale._count.items === 1 ? "item" : "items"}</div>
                </Td>
                <Td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatDateTime(sale.soldAt)}</Td>
                <Td>{sale.customerName ?? <span className="text-zinc-400">Walk-in</span>}</Td>
                <Td className="text-zinc-600 dark:text-zinc-400">
                  {[...new Set(sale.payments.map((payment) => formatEnum(payment.method)))].join(", ")}
                </Td>
                <Td align="right" className={sale.status === "CANCELLED" ? "text-zinc-400 line-through" : "font-medium"}>
                  {formatMoney(sale.totalAmount, settings.currencyCode)}
                </Td>
                <Td>
                  <Badge tone={sale.status === "COMPLETED" ? "green" : "red"}>{formatEnum(sale.status)}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination pathname="/sales" filters={filters} {...sales} />
    </>
  );
}
