import Link from "next/link";
import { Suspense } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { RevenueChart } from "@/app/components/revenue-chart";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  Td,
  Th,
} from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatEnum, formatMoney, formatNumber } from "@/lib/format";
import type { Decimal } from "@/lib/money";
import { getDashboard } from "@/lib/services/reports";
import { readBusinessSettings } from "@/lib/services/settings";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today at a glance. Revenue counts completed sales only and includes tax."
        actions={
          <ButtonLink href="/sales/new">
            <Plus className="size-4" aria-hidden /> New sale
          </ButtonLink>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  await requireUser(); // reading the session also keeps these live figures from being prerendered
  const [data, settings] = await Promise.all([getDashboard(), readBusinessSettings()]);
  const money = (value: Decimal | string) => formatMoney(value, settings.currencyCode);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's revenue"
          value={money(data.today.revenue)}
          hint={`${data.today.count} ${data.today.count === 1 ? "sale" : "sales"}`}
        />
        <StatCard
          label="Revenue, last 30 days"
          value={money(data.month.revenue)}
          hint={`${formatNumber(data.month.count)} sales · gross profit ${money(data.month.grossProfit)}`}
        />
        <StatCard
          label="Stock value at cost"
          value={money(data.stock.costValue)}
          hint={`${formatNumber(data.stock.units)} units in active products`}
        />
        <StatCard
          label="Low stock"
          value={formatNumber(data.lowStockCount)}
          tone={data.lowStockCount > 0 ? "warning" : "default"}
          hint={data.lowStockCount > 0 ? "products at or below reorder level" : "all products above reorder level"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Revenue, last 14 days" className="lg:col-span-2">
          <div className="p-4">
            <RevenueChart data={data.chart} currencyCode={settings.currencyCode} />
          </div>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              {data.lowStockCount > 0 && <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />}
              Needs restocking
            </span>
          }
          actions={
            data.lowStockCount > data.lowStock.length && (
              <Link href="/products?status=low" className="text-sm text-zinc-500 hover:underline">
                View all {data.lowStockCount}
              </Link>
            )
          }
        >
          {data.lowStock.length === 0 ? (
            <EmptyState title="Nothing to reorder">Every active product is above its reorder level.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <Link href={`/products/${product.id}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-medium">{product.name}</span>
                    <span className="font-mono text-xs text-zinc-500">{product.sku}</span>
                  </Link>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className={product.stockQuantity === 0 ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold"}>
                      {formatNumber(product.stockQuantity)}
                    </span>
                    <span className="block text-xs text-zinc-500">reorder at {formatNumber(product.reorderLevel)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Recent sales"
          actions={<Link href="/sales" className="text-sm text-zinc-500 hover:underline">All sales</Link>}
        >
          {data.recentSales.length === 0 ? (
            <EmptyState title="No sales yet">
              <Link href="/sales/new" className="underline">Record the first sale</Link>
            </EmptyState>
          ) : (
            <Table>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <Td>
                      <Link href={`/sales/${sale.id}`} className="font-mono font-medium hover:underline">{sale.invoiceNumber}</Link>
                      <div className="text-xs text-zinc-500">
                        {formatDateTime(sale.soldAt)} · {sale.customerName ?? "Walk-in"}
                      </div>
                    </Td>
                    <Td align="right" className={sale.status === "CANCELLED" ? "text-zinc-400 line-through" : "font-medium"}>
                      {money(sale.totalAmount)}
                    </Td>
                    <Td align="right">
                      {sale.status === "CANCELLED" && <Badge tone="red">{formatEnum(sale.status)}</Badge>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Top products, last 30 days">
          {data.topProducts.length === 0 ? (
            <EmptyState title="No sales in the last 30 days" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th align="right">Units</Th>
                  <Th align="right">Revenue</Th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product) => (
                  <tr key={product.id}>
                    <Td>
                      <Link href={`/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link>
                    </Td>
                    <Td align="right">{formatNumber(product.quantity)}</Td>
                    <Td align="right">{money(product.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="px-4 py-3 text-xs text-zinc-500">Revenue here is before discount and tax.</p>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
