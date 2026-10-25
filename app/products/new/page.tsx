import { connection } from "next/server";
import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { listCategoryOptions, listSupplierOptions } from "@/lib/services/catalogue";
import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" back={{ href: "/products", label: "Products" }} />
      <Card className="p-4 sm:p-6">
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <NewProductForm />
        </Suspense>
      </Card>
    </>
  );
}

async function NewProductForm() {
  await connection(); // the category and supplier lists change, so read them per request
  const [categories, suppliers] = await Promise.all([listCategoryOptions(), listSupplierOptions()]);
  return <ProductForm action={createProductAction} categories={categories} suppliers={suppliers} cancelHref="/products" />;
}
