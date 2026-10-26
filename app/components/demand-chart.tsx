"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { DemandPoint } from "@/lib/services/forecasts";

// Units sold per day (columns) followed by the forecast (line), on one axis.
// Two series, so a legend names them; colors are categorical slots 1 and 2,
// reached through currentColor because SVG attributes can't read var().

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export function DemandChart({ data }: { data: DemandPoint[] }) {
  const firstForecast = data.find((point) => point.forecast !== null)?.day;

  return (
    <div className="[--chart-grid:#e4e4e7] [--chart-surface:#ffffff] [--chart-text:#71717a] [--series-1:#2a78d6] [--series-2:#eb6834] dark:[--chart-grid:#27272a] dark:[--chart-surface:#18181b] dark:[--chart-text:#a1a1aa] dark:[--series-1:#3987e5] dark:[--series-2:#d95926]">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-(--series-1)" /> Units sold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-(--series-2)" /> Forecast
        </span>
      </div>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              dataKey="day"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip cursor={{ fill: "var(--chart-grid)", opacity: 0.5 }} content={(props) => <DemandTooltip {...props} />} />
            <Bar dataKey="actual" maxBarSize={16} radius={[4, 4, 0, 0]} fill="currentColor" className="text-(--series-1)" isAnimationActive={false} />
            <Line
              dataKey="forecast"
              type="monotone"
              stroke="currentColor"
              className="text-(--series-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* The same numbers as a table for screen readers. */}
      <table className="sr-only">
        <caption>Units sold per day, then the forecast from {firstForecast ? dayLabel(firstForecast) : "today"}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Units sold</th>
            <th>Forecast</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{dayLabel(point.day)}</td>
              <td>{point.actual ?? ""}</td>
              <td>{point.forecast ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemandTooltip({ active, payload }: Pick<TooltipContentProps, "active" | "payload">) {
  const point = payload?.[0]?.payload as DemandPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium">{dayLabel(point.day)}</p>
      {point.actual !== null && <p className="tabular-nums">{point.actual} sold</p>}
      {point.forecast !== null && <p className="tabular-nums">{point.forecast} forecast</p>}
    </div>
  );
}
