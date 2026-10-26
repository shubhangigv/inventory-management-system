import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { getCategory } from "@/lib/services/catalogue";
import { updateCategoryAction } from "../../actions";
import { CategoryForm } from "../../category-form";

export const metadata = { title: "Edit category" };

export default function EditCategoryPage({ params }: PageProps<"/categories/[id]/edit">) {
  return (
    <Suspense fallback={<TableSkeleton rows={3} />}>
      <EditCategory params={params} />
    </Suspense>
  );
}

async function EditCategory({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <>
      <PageHeader title={`Edit ${category.name}`} back={{ href: "/categories", label: "Categories" }} />
      <Card className="max-w-xl p-4 sm:p-6">
        <CategoryForm
          action={updateCategoryAction.bind(null, id)}
          category={{ name: category.name, description: category.description ?? "" }}
          cancelHref="/categories"
        />
      </Card>
    </>
  );
}
