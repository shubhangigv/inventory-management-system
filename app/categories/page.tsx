import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/app/components/delete-button";
import { buttonClass, Card, EmptyState, PageHeader, Table, TableSkeleton, Td, Th } from "@/app/components/ui";
import { listCategories } from "@/lib/services/catalogue";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Group products to find and filter them faster." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton />}>
            <CategoryTable />
          </Suspense>
        </Card>
        <Card title="New category" className="self-start">
          <div className="p-4">
            <CategoryForm action={createCategoryAction} />
          </div>
        </Card>
      </div>
    </>
  );
}

async function CategoryTable() {
  await connection();
  const categories = await listCategories();
  if (categories.length === 0) return <EmptyState title="No categories yet">Add one using the form.</EmptyState>;

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th align="right">Products</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id}>
            <Td>
              <span className="font-medium">{category.name}</span>
              {category.description && <div className="text-xs text-zinc-500">{category.description}</div>}
            </Td>
            <Td align="right">
              <Link href={`/products?category=${category.id}&status=all`} className="hover:underline">
                {category._count.products}
              </Link>
            </Td>
            <Td align="right">
              <div className="flex items-center justify-end gap-1">
                <Link href={`/categories/${category.id}/edit`} className={buttonClass("ghost", "px-2")} aria-label={`Edit ${category.name}`} title="Edit">
                  <Pencil className="size-4" aria-hidden />
                </Link>
                <DeleteButton
                  action={deleteCategoryAction.bind(null, category.id)}
                  label={`Delete ${category.name}`}
                  confirmMessage={`Delete "${category.name}"? Its ${category._count.products} product(s) are kept, just without a category.`}
                />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
