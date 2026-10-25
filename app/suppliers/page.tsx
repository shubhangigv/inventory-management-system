import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Pencil, Plus } from "lucide-react";
import { DeleteButton } from "@/app/components/delete-button";
import { ButtonLink, buttonClass, Card, EmptyState, PageHeader, Table, TableSkeleton, Td, Th } from "@/app/components/ui";
import { listSuppliers } from "@/lib/services/catalogue";
import { deleteSupplierAction } from "./actions";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy stock from."
        actions={
          <ButtonLink href="/suppliers/new">
            <Plus className="size-4" aria-hidden /> New supplier
          </ButtonLink>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <SupplierTable />
        </Suspense>
      </Card>
    </>
  );
}

async function SupplierTable() {
  await connection();
  const suppliers = await listSuppliers();
  if (suppliers.length === 0) {
    return (
      <EmptyState title="No suppliers yet">
        <Link href="/suppliers/new" className="underline">Add your first supplier</Link>
      </EmptyState>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Supplier</Th>
          <Th>Contact</Th>
          <Th align="right">Products</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {suppliers.map((supplier) => (
          <tr key={supplier.id}>
            <Td className="font-medium">{supplier.name}</Td>
            <Td className="text-zinc-600 dark:text-zinc-400">
              {supplier.contactName && <div>{supplier.contactName}</div>}
              <div className="text-xs">
                {[supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </Td>
            <Td align="right">{supplier._count.products}</Td>
            <Td align="right">
              <div className="flex items-center justify-end gap-1">
                <Link href={`/suppliers/${supplier.id}/edit`} className={buttonClass("ghost", "px-2")} aria-label={`Edit ${supplier.name}`} title="Edit">
                  <Pencil className="size-4" aria-hidden />
                </Link>
                <DeleteButton
                  action={deleteSupplierAction.bind(null, supplier.id)}
                  label={`Delete ${supplier.name}`}
                  confirmMessage={`Delete "${supplier.name}"? Its ${supplier._count.products} product(s) are kept, just without a supplier.`}
                />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
