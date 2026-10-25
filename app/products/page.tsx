import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { Pagination } from "@/app/components/pagination";
import {
  ButtonLink,
  buttonClass,
  Card,
  EmptyState,
  inputClass,
  PageHeader,
  StockBadge,
  Table,
  TableSkeleton,
  Td,
  Th,
} from "@/app/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";
import { listCategoryOptions } from "@/lib/services/catalogue";
import { listProducts, productStatusFilters } from "@/lib/services/products";
import { readBusinessSettings } from "@/lib/services/settings";
import { enumParam, pageParam, param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Products" };

const statusLabels = { active: "Active", low: "Low stock", inactive: "Inactive", all: "All products" } as const;

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you stock and sell."
        actions={
          <ButtonLink href="/products/new">
            <Plus className="size-4" aria-hidden /> New product
          </ButtonLink>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <ProductTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ProductTable({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = {
    q: param(params, "q"),
    category: param(params, "category"),
    status: enumParam(params, "status", productStatusFilters) ?? "active",
  };
  const [products, categories, settings] = await Promise.all([
    listProducts({ query: filters.q, categoryId: filters.category, status: filters.status, page: pageParam(params) }),
    listCategoryOptions(),
    readBusinessSettings(),
  ]);

  return (
    <>
      <Form action="" className="flex flex-col gap-2 border-b border-zinc-200 p-4 sm:flex-row dark:border-zinc-800">
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" type="search" placeholder="Search name or SKU" defaultValue={filters.q} className={inputClass} />
        <label className="sr-only" htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={filters.category ?? ""} className={`${inputClass} sm:w-48`}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={filters.status} className={`${inputClass} sm:w-40`}>
          {productStatusFilters.map((status) => (
            <option key={status} value={status}>{statusLabels[status]}</option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary")}>
          <Search className="size-4" aria-hidden /> Filter
        </button>
      </Form>

      {products.rows.length === 0 ? (
        <EmptyState title="No products found">
          {filters.q || filters.category || filters.status !== "active" ? (
            "Try a different search or filter."
          ) : (
            <Link href="/products/new" className="underline">Add your first product</Link>
          )}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {products.rows.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <Td>
                  <Link href={`/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link>
                  <div className="font-mono text-xs text-zinc-500">{product.sku}</div>
                </Td>
                <Td className="text-zinc-600 dark:text-zinc-400">{product.category?.name ?? "—"}</Td>
                <Td align="right">{formatMoney(product.sellingPrice, settings.currencyCode)}</Td>
                <Td align="right">{formatNumber(product.stockQuantity)}</Td>
                <Td>
                  <StockBadge stock={product.stockQuantity} reorderLevel={product.reorderLevel} isActive={product.isActive} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination pathname="/products" filters={filters} {...products} />
    </>
  );
}
