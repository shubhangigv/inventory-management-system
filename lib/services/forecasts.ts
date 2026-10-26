import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

// Read side of the demand forecast. forecasting/forecast.py (Python,
// scikit-learn) trains the model and writes ForecastRun + DemandForecast
// rows; this file reads them for the pages and can start a new run.
//
// The stored forecast is per day, so reorder figures are recalculated here
// against the product's *current* stock: a sale made after the run still
// changes whether it needs ordering.

const DAY_MS = 24 * 60 * 60 * 1000;
export const FORECAST_STALE_AFTER_DAYS = 2;

export type ReorderStatus = "ORDER_NOW" | "ORDER_SOON" | "OK" | "NO_DEMAND";

/** Units the forecast expects over the next `days` days (past the horizon at the average rate). */
function demandOver(daily: number[], days: number) {
  const total = daily.slice(0, days).reduce((sum, value) => sum + value, 0);
  if (days <= daily.length || daily.length === 0) return total;
  return total + (total / daily.length) * (days - daily.length);
}

function daysOfStock(stock: number, daily: number[]) {
  const total = daily.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  let used = 0;
  for (const [day, demand] of daily.entries()) {
    if (used + demand >= stock) return demand > 0 ? day + (stock - used) / demand : day;
    used += demand;
  }
  return daily.length + (stock - used) / (total / daily.length);
}

type StoredForecast = {
  forecastDaily: number[];
  leadTimeDays: number;
  reviewDays: number;
  safetyStock: number;
  reorderPoint: number;
};

/** Reorder advice for the stock on hand now, from a stored forecast. */
export function reorderAdvice(forecast: StoredForecast, stock: number) {
  const { forecastDaily, leadTimeDays, reviewDays, safetyStock, reorderPoint } = forecast;
  const orderUpTo = demandOver(forecastDaily, leadTimeDays + reviewDays) + safetyStock;
  const days = daysOfStock(stock, forecastDaily);
  const suggestedOrder = stock <= reorderPoint ? Math.max(0, Math.ceil(orderUpTo - stock)) : 0;

  let status: ReorderStatus;
  if (days === null) status = "NO_DEMAND";
  else if (stock <= reorderPoint) status = "ORDER_NOW";
  else if (days <= leadTimeDays + reviewDays) status = "ORDER_SOON"; // runs out before the next order would arrive
  else status = "OK";

  return { status, suggestedOrder, daysOfStock: days };
}

const statusRank: Record<ReorderStatus, number> = { ORDER_NOW: 0, ORDER_SOON: 1, OK: 2, NO_DEMAND: 3 };

/** The latest run with every product's forecast, most urgent first. Null if no run exists yet. */
export async function getLatestForecast() {
  const run = await prisma.forecastRun.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      forecasts: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              stockQuantity: true,
              isActive: true,
              supplier: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!run) return null;

  const rows = run.forecasts
    .filter((forecast) => forecast.product.isActive)
    .map((forecast) => ({ ...forecast, advice: reorderAdvice(forecast, forecast.product.stockQuantity) }))
    .sort(
      (a, b) =>
        statusRank[a.advice.status] - statusRank[b.advice.status] ||
        (a.advice.daysOfStock ?? Infinity) - (b.advice.daysOfStock ?? Infinity) ||
        a.product.name.localeCompare(b.product.name),
    );

  const forecastIds = new Set(rows.map((row) => row.productId));
  const withoutForecast = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: [...forecastIds] } },
    select: { id: true, sku: true, name: true },
    orderBy: { name: "asc" },
  });

  const ageDays = (Date.now() - run.createdAt.getTime()) / DAY_MS;
  return { run, rows, withoutForecast, isStale: ageDays > FORECAST_STALE_AFTER_DAYS };
}

/** Products the latest forecast says to order now, for the dashboard. */
export async function getReorderSuggestions(limit = 5) {
  const latest = await getLatestForecast();
  if (!latest) return null;
  const orderNow = latest.rows.filter((row) => row.advice.status === "ORDER_NOW");
  return { run: latest.run, count: orderNow.length, rows: orderNow.slice(0, limit), isStale: latest.isStale };
}

export type DemandPoint = { day: string; actual: number | null; forecast: number | null };

/**
 * One product's last `pastDays` days of sales and its latest forecast, for the
 * product page chart. Null when the product has no forecast yet.
 */
export async function getProductDemand(productId: string, pastDays = 28) {
  const forecast = await prisma.demandForecast.findFirst({
    where: { productId },
    orderBy: { run: { createdAt: "desc" } },
    include: { run: { select: { createdAt: true } } },
  });
  if (!forecast) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

  const runDay = new Date(forecast.run.createdAt);
  runDay.setHours(0, 0, 0, 0);
  const since = new Date(runDay.getTime() - pastDays * DAY_MS);

  const sold = await prisma.$queryRaw<{ day: string; units: bigint }[]>`
    SELECT to_char((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
           SUM(i."quantity") AS units
    FROM "SaleItem" i
    JOIN "Sale" s ON s."id" = i."saleId"
    WHERE i."productId" = ${productId} AND s."status" = 'COMPLETED'
      AND s."soldAt" >= ${since} AND s."soldAt" < ${runDay}
    GROUP BY 1`;
  const byDay = new Map(sold.map((row) => [row.day, Number(row.units)]));

  // Noon avoids landing on the wrong day around daylight-saving changes.
  const noon = (offset: number) => new Date(since.getTime() + offset * DAY_MS + DAY_MS / 2);
  const points: DemandPoint[] = [
    ...Array.from({ length: pastDays }, (_, i) => {
      const day = dayKey(noon(i));
      return { day, actual: byDay.get(day) ?? 0, forecast: null };
    }),
    ...forecast.forecastDaily.map((value, i) => ({
      day: dayKey(noon(pastDays + i)),
      actual: null,
      forecast: Math.round(value * 10) / 10,
    })),
  ];
  return { forecast, points };
}

// ---------- Running the Python job ----------

const execFileAsync = promisify(execFile);
let running = false;

function pythonPath() {
  if (process.env.FORECAST_PYTHON) return process.env.FORECAST_PYTHON;
  // turbopackIgnore: a runtime path, not a file to bundle (otherwise the build traces the whole venv).
  const venv = path.join(/* turbopackIgnore: true */ process.cwd(), "forecasting", ".venv");
  return process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python");
}

/**
 * Runs forecasting/forecast.py and returns its last line ("Saved forecast run ...").
 * Fixed program and arguments (no user input reaches the command line), one
 * run at a time per server, and a time limit.
 */
export async function runForecast() {
  if (running) throw new AppError("CONFLICT", "A forecast is already running. Try again in a minute.");
  running = true;
  try {
    const { stdout } = await execFileAsync(pythonPath(), [path.join("forecasting", "forecast.py")], {
      cwd: process.cwd(),
      timeout: 180_000,
      windowsHide: true,
    });
    return stdout.trim().split(/\r?\n/).at(-1) ?? "Forecast finished.";
  } catch (error) {
    console.error("Forecast run failed:", error);
    const code = (error as NodeJS.ErrnoException).code;
    throw new AppError(
      "INVALID_STATE",
      code === "ENOENT"
        ? "Python for the forecast isn't set up on this server. Run `npm run forecast:setup`."
        : "The forecast failed. Check the server log for details.",
    );
  } finally {
    running = false;
  }
}
