import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/app/components/ui";
import { listSellableProducts } from "@/lib/services/products";
import { readBusinessSettings } from "@/lib/services/settings";
import { PointOfSale } from "./point-of-sale";

export const metadata = { title: "New sale" };

export default function NewSalePage() {
  return (
    <>
      <PageHeader title="New sale" description="Add products, take payment, and the invoice is created." />
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <Checkout />
      </Suspense>
    </>
  );
}

async function Checkout() {
  await connection(); // stock and prices must be current
  const [products, settings] = await Promise.all([listSellableProducts(), readBusinessSettings()]);

  if (products.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        There are no active products to sell yet. <Link href="/products/new" className="underline">Add a product</Link> first.
      </p>
    );
  }

  return (
    <PointOfSale
      // Decimal can't be passed to a Client Component, so prices travel as "12.50" strings.
      products={products.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.sellingPrice.toFixed(2),
        stock: product.stockQuantity,
      }))}
      taxRate={settings.taxRate.toFixed(2)}
      currencyCode={settings.currencyCode}
    />
  );
}
