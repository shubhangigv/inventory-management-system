import type { Prisma } from "@/app/generated/prisma/client";
import { Decimal } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { lowStockWhere } from "./products";

// Read-only figures for the dashboard. Only COMPLETED sales count as revenue.
//
// "Today" and the daily chart use the server's time zone, the same one used to
// display dates. soldAt is stored in UTC, so SQL converts it before grouping.

const DAY_MS = 24 * 60 * 60 * 1000;

const serverTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** YYYY-MM-DD of a moment in the given time zone ("en-CA" formats dates that way). */
const dayKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export type DailyRevenue = { day: string; revenue: number; sales: number };

/** Revenue per day for the last `days` days, including days without sales. */
async function dailyRevenue(days: number): Promise<DailyRevenue[]> {
  const timeZone = serverTimeZone();
  const since = new Date(startOfToday().getTime() - (days - 1) * DAY_MS);

  const rows = await prisma.$queryRaw<{ day: string; revenue: Prisma.Decimal; sales: bigint }[]>`
    SELECT to_char(("soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
           SUM("totalAmount") AS revenue,
           COUNT(*) AS sales
    FROM "Sale"
    WHERE "status" = 'COMPLETED' AND "soldAt" >= ${since}
    GROUP BY 1`;
  const byDay = new Map(rows.map((row) => [row.day, row]));

  return Array.from({ length: days }, (_, index) => {
    // Noon avoids landing on the wrong day around daylight-saving changes.
    const day = dayKey(new Date(since.getTime() + index * DAY_MS + DAY_MS / 2), timeZone);
    const row = byDay.get(day);
    return { day, revenue: row ? Number(row.revenue) : 0, sales: row ? Number(row.sales) : 0 };
  });
}

/** Revenue, net sales (before tax) and the cost of the goods sold since a date. */
async function salesSince(since: Date) {
  const [[sales], [cost]] = await Promise.all([
    prisma.$queryRaw<{ revenue: Prisma.Decimal | null; net: Prisma.Decimal | null; count: bigint }[]>`
      SELECT SUM("totalAmount") AS revenue,
             SUM("subtotal" - "discountAmount") AS net,
             COUNT(*) AS count
      FROM "Sale"
      WHERE "status" = 'COMPLETED' AND "soldAt" >= ${since}`,
    prisma.$queryRaw<{ cost: Prisma.Decimal | null }[]>`
      SELECT SUM(i."quantity" * i."unitCost") AS cost
      FROM "SaleItem" i
      JOIN "Sale" s ON s."id" = i."saleId"
      WHERE s."status" = 'COMPLETED' AND s."soldAt" >= ${since}`,
  ]);
  const net = new Decimal(sales.net ?? 0);
  return {
    revenue: new Decimal(sales.revenue ?? 0),
    count: Number(sales.count),
    // Gross profit = what was charged before tax, minus what the goods cost.
    grossProfit: net.minus(cost.cost ?? 0),
  };
}

export async function getDashboard() {
  const monthStart = new Date(startOfToday().getTime() - 29 * DAY_MS);

  const [today, month, [stock], lowStockCount, lowStock, topProducts, recentSales, chart] = await Promise.all([
    salesSince(startOfToday()),
    salesSince(monthStart),
    prisma.$queryRaw<{ costValue: Prisma.Decimal | null; units: bigint | null }[]>`
      SELECT SUM("stockQuantity" * "costPrice") AS "costValue", SUM("stockQuantity") AS units
      FROM "Product"
      WHERE "isActive"`,
    prisma.product.count({ where: lowStockWhere }),
    prisma.product.findMany({
      where: lowStockWhere,
      select: { id: true, sku: true, name: true, stockQuantity: true, reorderLevel: true },
      orderBy: [{ stockQuantity: "asc" }, { name: "asc" }],
      take: 6,
    }),
    prisma.$queryRaw<{ id: string; name: string; quantity: bigint; revenue: Prisma.Decimal }[]>`
      SELECT i."productId" AS id,
             MAX(i."productName") AS name,
             SUM(i."quantity") AS quantity,
             SUM(i."quantity" * i."unitPrice") AS revenue
      FROM "SaleItem" i
      JOIN "Sale" s ON s."id" = i."saleId"
      WHERE s."status" = 'COMPLETED' AND s."soldAt" >= ${monthStart}
      GROUP BY i."productId"
      ORDER BY revenue DESC
      LIMIT 5`,
    prisma.sale.findMany({
      select: { id: true, invoiceNumber: true, customerName: true, totalAmount: true, status: true, soldAt: true },
      orderBy: [{ soldAt: "desc" }, { id: "desc" }],
      take: 6,
    }),
    dailyRevenue(14),
  ]);

  return {
    today,
    month,
    stock: { costValue: new Decimal(stock.costValue ?? 0), units: Number(stock.units ?? 0) },
    lowStockCount,
    lowStock,
    topProducts: topProducts.map((row) => ({ ...row, quantity: Number(row.quantity) })),
    recentSales,
    chart,
  };
}
