import type { NextRequest } from "next/server";
import { SaleStatus } from "@/app/generated/prisma/enums";
import { getSession } from "@/lib/auth";
import { csvResponse, fileDate, toCsv } from "@/lib/csv";
import { formatEnum } from "@/lib/format";
import { exportSales } from "@/lib/services/sales";
import { dateParam, enumParam, param } from "@/lib/search-params";

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /sales/export?q=&status=&from=&to= : sales as CSV, with the same filters
// as the sales page. Cancelled sales are included (with their status) unless
// filtered out, so the file matches the screen.
export async function GET(request: NextRequest) {
  if (!(await getSession())) return new Response("Please log in.", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const to = dateParam(params, "to");
  const sales = await exportSales({
    query: param(params, "q"),
    status: enumParam(params, "status", Object.values(SaleStatus)),
    from: dateParam(params, "from"),
    to: to && new Date(to.getTime() + DAY_MS),
  });

  const csv = toCsv(
    ["Invoice", "Sold at", "Status", "Customer", "Items", "Subtotal", "Discount", "Tax", "Total", "Paid by", "Sold by"],
    sales.map((s) => [
      s.invoiceNumber,
      s.soldAt.toISOString(),
      formatEnum(s.status),
      s.customerName,
      s._count.items,
      s.subtotal.toFixed(2),
      s.discountAmount.toFixed(2),
      s.taxAmount.toFixed(2),
      s.totalAmount.toFixed(2),
      [...new Set(s.payments.map((payment) => formatEnum(payment.method)))].join(" + "),
      s.createdBy?.name,
    ]),
  );
  return csvResponse(`sales-${fileDate()}.csv`, csv);
}
