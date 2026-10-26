import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { createSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export const metadata = { title: "New supplier" };

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="New supplier" back={{ href: "/suppliers", label: "Suppliers" }} />
      <Card className="p-4 sm:p-6">
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <NewSupplierForm />
        </Suspense>
      </Card>
    </>
  );
}

async function NewSupplierForm() {
  await requireAdminPage();
  return <SupplierForm action={createSupplierAction} />;
}
