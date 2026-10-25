import Form from "next/form";
import { connection } from "next/server";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { StockMovementType } from "@/app/generated/prisma/enums";
import { Pagination } from "@/app/components/pagination";
import { buttonClass, Card, inputClass, PageHeader, TableSkeleton } from "@/app/components/ui";
import { listStockMovements } from "@/lib/services/inventory";
import { listProductOptions } from "@/lib/services/products";
import { enumParam, pageParam, param, type SearchParams } from "@/lib/search-params";
import { MovementTable, movementTypeLabels } from "./movement-table";
import { StockForm } from "./stock-form";

export const metadata = { title: "Stock history" };

const movementTypes = Object.values(StockMovementType);

export default function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  return (
    <>
      <PageHeader
        title="Stock history"
        description="Every change to stock: deliveries, sales, cancellations and adjustments. Entries can't be edited or deleted."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton rows={10} />}>
            <Ledger searchParams={searchParams} />
          </Suspense>
        </Card>
        <Card title="Record a stock change" className="self-start">
          <Suspense fallback={<TableSkeleton rows={4} />}>
            <StockFormWithProducts />
          </Suspense>
        </Card>
      </div>
    </>
  );
}

async function Ledger({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = { product: param(params, "product"), type: enumParam(params, "type", movementTypes) };
  const [movements, products] = await Promise.all([
    listStockMovements({ productId: filters.product, type: filters.type, page: pageParam(params) }),
    listProductOptions(),
  ]);

  return (
    <>
      <Form action="" className="flex flex-col gap-2 border-b border-zinc-200 p-4 sm:flex-row dark:border-zinc-800">
        <label className="sr-only" htmlFor="product">Product</label>
        <select id="product" name="product" defaultValue={filters.product ?? ""} className={inputClass}>
          <option value="">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue={filters.type ?? ""} className={`${inputClass} sm:w-44`}>
          <option value="">All types</option>
          {movementTypes.map((type) => (
            <option key={type} value={type}>{movementTypeLabels[type]}</option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary")}>
          <Search className="size-4" aria-hidden /> Filter
        </button>
      </Form>
      <MovementTable movements={movements.rows} />
      <Pagination pathname="/inventory" filters={filters} {...movements} />
    </>
  );
}

async function StockFormWithProducts() {
  await connection();
  const products = (await listProductOptions()).filter((product) => product.isActive);
  return <StockForm products={products} />;
}
