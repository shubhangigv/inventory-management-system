import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { getSupplier } from "@/lib/services/catalogue";
import { updateSupplierAction } from "../../actions";
import { SupplierForm } from "../../supplier-form";

export const metadata = { title: "Edit supplier" };

export default function EditSupplierPage({ params }: PageProps<"/suppliers/[id]/edit">) {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <EditSupplier params={params} />
    </Suspense>
  );
}

async function EditSupplier({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <>
      <PageHeader title={`Edit ${supplier.name}`} back={{ href: "/suppliers", label: "Suppliers" }} />
      <Card className="p-4 sm:p-6">
        <SupplierForm
          action={updateSupplierAction.bind(null, id)}
          supplier={{
            name: supplier.name,
            contactName: supplier.contactName ?? "",
            email: supplier.email ?? "",
            phone: supplier.phone ?? "",
            address: supplier.address ?? "",
          }}
        />
      </Card>
    </>
  );
}
