import { Card, PageHeader } from "@/app/components/ui";
import { createSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export const metadata = { title: "New supplier" };

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="New supplier" back={{ href: "/suppliers", label: "Suppliers" }} />
      <Card className="p-4 sm:p-6">
        <SupplierForm action={createSupplierAction} />
      </Card>
    </>
  );
}
