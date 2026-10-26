import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { csvResponse, fileDate, toCsv } from "@/lib/csv";
import { exportProducts, productStatusFilters } from "@/lib/services/products";
import { enumParam, param } from "@/lib/search-params";

// GET /products/export?q=&category=&status= : the product list as CSV, with the
// same filters as the products page.
export async function GET(request: NextRequest) {
  if (!(await getSession())) return new Response("Please log in.", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const products = await exportProducts({
    query: param(params, "q"),
    categoryId: param(params, "category"),
    status: enumParam(params, "status", productStatusFilters) ?? "active",
  });

  const csv = toCsv(
    ["SKU", "Name", "Category", "Supplier", "Cost price", "Selling price", "Stock", "Reorder level", "Active"],
    products.map((p) => [
      p.sku,
      p.name,
      p.category?.name,
      p.supplier?.name,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      p.stockQuantity,
      p.reorderLevel,
      p.isActive ? "Yes" : "No",
    ]),
  );
  return csvResponse(`products-${fileDate()}.csv`, csv);
}
