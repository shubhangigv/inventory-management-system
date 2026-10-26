import Link from "next/link";
import { Suspense } from "react";
import { TriangleAlert } from "lucide-react";
import { AdminOnly } from "@/app/components/user-menu";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table, TableSkeleton, Td, Th } from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDays, formatNumber } from "@/lib/format";
import { getLatestForecast, type ReorderStatus } from "@/lib/services/forecasts";
import { RunForecastButton } from "./run-forecast-button";

export const metadata = { title: "Demand forecast" };

const statusBadge: Record<ReorderStatus, { tone: "red" | "amber" | "green" | "neutral"; label: string }> = {
  ORDER_NOW: { tone: "red", label: "Order now" },
  ORDER_SOON: { tone: "amber", label: "Order soon" },
  OK: { tone: "green", label: "OK" },
  NO_DEMAND: { tone: "neutral", label: "No demand" },
};

const classLabel = { FAST: "Fast", MEDIUM: "Medium", SLOW: "Slow" } as const;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const oneDecimal = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);

export default function ForecastPage() {
  return (
    <>
      <PageHeader
        title="Demand forecast"
        description="Predicted sales for the next 14 days and what to reorder, from a machine-learning model trained on your sales history."
        actions={
          <Suspense fallback={null}>
            <AdminOnly>
              <RunForecastButton />
            </AdminOnly>
          </Suspense>
        }
      />
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <Forecast />
      </Suspense>
    </>
  );
}

async function Forecast() {
  await requireUser();
  const latest = await getLatestForecast();
  if (!latest) {
    return (
      <Card>
        <EmptyState title="No forecast yet">
          An admin can press <strong>Run forecast</strong>, or run <code>npm run forecast</code> on the server.
          Products need at least 6 weeks of sales history.
        </EmptyState>
      </Card>
    );
  }

  const { run, rows, withoutForecast, isStale } = latest;
  const orderNow = rows.filter((row) => row.advice.status === "ORDER_NOW").length;
  const improvement = run.baselineMae > 0 ? 1 - run.chosenMae / run.baselineMae : 0;

  return (
    <>
      {isStale && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          This forecast is from {formatDateTime(run.createdAt)}. Run it again for up-to-date predictions.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Order now"
          value={formatNumber(orderNow)}
          tone={orderNow > 0 ? "warning" : "default"}
          hint="products at or below their forecast reorder point"
        />
        <StatCard
          label="Forecast error (WAPE)"
          value={percent(run.chosenWape)}
          hint={`moving average alone: ${percent(run.baselineWape)}`}
        />
        <StatCard
          label="Error vs. simple average"
          value={improvement > 0 ? `−${percent(improvement)}` : "—"}
          hint={`MAE ${run.chosenMae.toFixed(2)} vs ${run.baselineMae.toFixed(2)} units/day`}
        />
        <StatCard
          label="Last run"
          value={formatDateTime(run.createdAt)}
          hint={`${run.historyDays} days of history · ${Math.round(run.serviceLevel * 100)}% service level`}
        />
      </div>

      <Card title="Reorder plan">
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Demand</Th>
              <Th align="right">Avg / day</Th>
              <Th align="right">Next 14 days</Th>
              <Th align="right">In stock</Th>
              <Th align="right">Lasts</Th>
              <Th align="right">Reorder at</Th>
              <Th align="right">Order qty</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = statusBadge[row.advice.status];
              const days = row.advice.daysOfStock;
              return (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <Td>
                    <Link href={`/products/${row.product.id}`} className="font-medium hover:underline">{row.product.name}</Link>
                    <div className="text-xs text-zinc-500">
                      {row.product.sku}
                      {row.product.supplier && ` · ${row.product.supplier.name}`}
                    </div>
                  </Td>
                  <Td>
                    <div>{classLabel[row.demandClass]}</div>
                    <div className="text-xs text-zinc-500" title={row.method === "ML_MODEL" ? "Gradient-boosted model beat the 28-day average in backtests" : "The 28-day average was as accurate as the model"}>
                      {row.method === "ML_MODEL" ? "ML model" : "28-day average"}
                    </div>
                  </Td>
                  <Td align="right" className="tabular-nums">{oneDecimal(row.avgDailySales)}</Td>
                  <Td align="right" className="tabular-nums">{formatNumber(Math.round(row.forecastTotal))}</Td>
                  <Td align="right" className="tabular-nums">{formatNumber(row.product.stockQuantity)}</Td>
                  <Td align="right" className="tabular-nums whitespace-nowrap">{formatDays(days)}</Td>
                  <Td align="right" className="tabular-nums">{formatNumber(row.reorderPoint)}</Td>
                  <Td align="right" className="font-medium tabular-nums">
                    {row.advice.suggestedOrder > 0 ? formatNumber(row.advice.suggestedOrder) : "—"}
                  </Td>
                  <Td>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="How the forecast works">
          <ul className="flex list-disc flex-col gap-2 py-4 pr-4 pl-8 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              A gradient-boosted tree model (scikit-learn) learns from daily sales: weekday, salary days at the start of
              the month, and recent sales. Days a product was sold out are left out, because they hide real demand.
            </li>
            <li>
              It is tested against a plain 28-day average on the last 6 weeks, which it never saw. Each product keeps
              whichever method was more accurate; slow sellers like spices often keep the average.
            </li>
            <li>
              <strong>Reorder at</strong> = forecast demand during the supplier&apos;s delivery time + safety stock.
              At or below it, <strong>Order qty</strong> covers delivery time + the order cycle (daily for milk, weekly
              for staples).
            </li>
          </ul>
        </Card>
        <Card title="Not forecast yet">
          {withoutForecast.length === 0 ? (
            <EmptyState title="Every active product has a forecast" />
          ) : (
            <div className="p-4 text-sm">
              <p className="text-zinc-600 dark:text-zinc-400">
                These products have less than 6 weeks of sales history, so they still use their fixed reorder level:
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {withoutForecast.map((product) => (
                  <li key={product.id}>
                    <Link href={`/products/${product.id}`} className="hover:underline">
                      <Badge>{product.name}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
