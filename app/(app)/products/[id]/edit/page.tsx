import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { listCategoryOptions, listSupplierOptions } from "@/lib/services/catalogue";
import { getProduct } from "@/lib/services/products";
import { updateProductAction } from "../../actions";
import { ProductForm } from "../../product-form";

export const metadata = { title: "Edit product" };

export default function EditProductPage({ params }: PageProps<"/products/[id]/edit">) {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [product, categories, suppliers] = await Promise.all([
    getProduct(id),
    listCategoryOptions(),
    listSupplierOptions(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={`Edit ${product.name}`} back={{ href: `/products/${id}`, label: product.name }} />
      <Card className="p-4 sm:p-6">
        <ProductForm
          action={updateProductAction.bind(null, id)}
          categories={categories}
          suppliers={suppliers}
          cancelHref={`/products/${id}`}
          product={{
            sku: product.sku,
            name: product.name,
            description: product.description ?? "",
            costPrice: product.costPrice.toFixed(2),
            sellingPrice: product.sellingPrice.toFixed(2),
            reorderLevel: String(product.reorderLevel),
            categoryId: product.categoryId ?? "",
            supplierId: product.supplierId ?? "",
          }}
        />
      </Card>
    </>
  );
}
