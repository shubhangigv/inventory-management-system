"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatMoney } from "@/lib/format";
import type { DailyRevenue } from "@/lib/services/reports";

// Daily revenue as columns: one series, so the card title names it and no legend is needed.
// Colors are CSS variables (light/dark), reached through currentColor because
// SVG presentation attributes can't read var() directly.

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export function RevenueChart({ data, currencyCode }: { data: DailyRevenue[]; currencyCode: string }) {
  const compact = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div className="[--chart-grid:#e4e4e7] [--chart-text:#71717a] [--series-1:#2a78d6] dark:[--chart-grid:#27272a] dark:[--chart-text:#a1a1aa] dark:[--series-1:#3987e5]">
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              dataKey="day"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(value: number) => compact.format(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              width={64}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.5 }}
              content={(props) => <RevenueTooltip {...props} currencyCode={currencyCode} />}
            />
            <Bar dataKey="revenue" maxBarSize={24} radius={[4, 4, 0, 0]} fill="currentColor" className="text-(--series-1)" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The same numbers as a table for screen readers. */}
      <table className="sr-only">
        <caption>Revenue per day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Sales</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.day}>
              <td>{dayLabel(row.day)}</td>
              <td>{row.sales}</td>
              <td>{formatMoney(row.revenue, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevenueTooltip({ active, payload, currencyCode }: Pick<TooltipContentProps, "active" | "payload"> & { currencyCode: string }) {
  const row = payload?.[0]?.payload as DailyRevenue | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium">{dayLabel(row.day)}</p>
      <p className="tabular-nums">{formatMoney(row.revenue, currencyCode)}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {row.sales} {row.sales === 1 ? "sale" : "sales"}
      </p>
    </div>
  );
}
