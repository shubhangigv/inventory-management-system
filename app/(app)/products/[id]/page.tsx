import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { StockForm } from "@/app/(app)/inventory/stock-form";
import { MovementTable } from "@/app/(app)/inventory/movement-table";
import { ButtonLink, Card, PageHeader, Skeleton, StockBadge, TableSkeleton } from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { formatMoney, formatNumber } from "@/lib/format";
import { Decimal } from "@/lib/money";
import { listStockMovements } from "@/lib/services/inventory";
import { getProduct } from "@/lib/services/products";
import { readBusinessSettings } from "@/lib/services/settings";
import { ProductStatusActions } from "./product-status-actions";

export const metadata = { title: "Product" };

export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [product, movements, settings] = await Promise.all([
    getProduct(id),
    listStockMovements({ productId: id }),
    readBusinessSettings(),
  ]);
  if (!product) notFound();

  const money = (value: Decimal) => formatMoney(value, settings.currencyCode);
  const margin = product.sellingPrice.minus(product.costPrice);
  const marginPercent = product.sellingPrice.isZero() ? null : margin.dividedBy(product.sellingPrice).times(100);

  return (
    <>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title={product.name}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono">{product.sku}</span>
            <StockBadge stock={product.stockQuantity} reorderLevel={product.reorderLevel} isActive={product.isActive} />
          </span>
        }
        actions={
          isAdmin && (
            <ButtonLink href={`/products/${id}/edit`} variant="secondary">
              <Pencil className="size-4" aria-hidden /> Edit
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-3">
              <Detail label="In stock" value={<span className="text-lg font-semibold">{formatNumber(product.stockQuantity)}</span>} />
              <Detail label="Reorder level" value={formatNumber(product.reorderLevel)} />
              <Detail label="Stock value (cost)" value={money(product.costPrice.times(product.stockQuantity))} />
              <Detail label="Selling price" value={money(product.sellingPrice)} />
              <Detail label="Cost price" value={money(product.costPrice)} />
              <Detail
                label="Margin"
                value={`${money(margin)}${marginPercent ? ` (${marginPercent.toFixed(1)}%)` : ""}`}
              />
              <Detail
                label="Category"
                value={product.category ? <Link href={`/products?category=${product.category.id}&status=all`} className="hover:underline">{product.category.name}</Link> : "—"}
              />
              <Detail
                label="Supplier"
                value={
                  product.supplier && isAdmin ? (
                    <Link href={`/suppliers/${product.supplier.id}/edit`} className="hover:underline">{product.supplier.name}</Link>
                  ) : (
                    (product.supplier?.name ?? "—")
                  )
                }
              />
              {product.description && <Detail label="Description" value={product.description} className="sm:col-span-3" />}
            </dl>
          </Card>

          <Card
            title="Stock history"
            actions={
              movements.total > movements.rows.length && (
                <Link href={`/inventory?product=${id}`} className="text-sm text-zinc-500 hover:underline">
                  View all {formatNumber(movements.total)}
                </Link>
              )
            }
          >
            <MovementTable movements={movements.rows} showProduct={false} />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Update stock">
            <StockForm productId={id} />
          </Card>
          {isAdmin && (
            <Card title="Status">
              <div className="flex flex-col gap-3 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  {product.isActive
                    ? "Inactive products are hidden from new sales. Their history is kept."
                    : "This product is inactive and can't be sold."}
                </p>
                <ProductStatusActions id={id} isActive={product.isActive} canDelete={movements.total === 0} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Detail({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <TableSkeleton />
    </div>
  );
}
