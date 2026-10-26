import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
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
  await requireAdminPage();
  const [categories, suppliers] = await Promise.all([listCategoryOptions(), listSupplierOptions()]);
  return <ProductForm action={createProductAction} categories={categories} suppliers={suppliers} cancelHref="/products" />;
}
