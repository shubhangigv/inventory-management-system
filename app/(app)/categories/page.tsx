import Link from "next/link";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/app/components/delete-button";
import { buttonClass, Card, EmptyState, PageHeader, Table, TableSkeleton, Td, Th } from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/services/catalogue";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Group products to find and filter them faster." />
      <Suspense fallback={<Card><TableSkeleton /></Card>}>
        <Categories />
      </Suspense>
    </>
  );
}

/** Admins get the table and a "New category" form beside it; staff only see the table. */
async function Categories() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const categories = await listCategories();

  if (!isAdmin) {
    return (
      <Card>
        <CategoryTable categories={categories} isAdmin={false} />
      </Card>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CategoryTable categories={categories} isAdmin />
      </Card>
      <Card title="New category" className="self-start">
        <div className="p-4">
          <CategoryForm action={createCategoryAction} />
        </div>
      </Card>
    </div>
  );
}

function CategoryTable({ categories, isAdmin }: {
  categories: Awaited<ReturnType<typeof listCategories>>;
  isAdmin: boolean;
}) {
  if (categories.length === 0) {
    return <EmptyState title="No categories yet">{isAdmin ? "Add one using the form." : "An admin can add them."}</EmptyState>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th align="right">Products</Th>
          {isAdmin && <Th />}
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
            {isAdmin && (
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
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
