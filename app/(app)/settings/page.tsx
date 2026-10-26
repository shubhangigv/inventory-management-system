import { Suspense } from "react";
import { DatabaseStatus, DatabaseStatusSkeleton } from "@/app/components/database-status";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { readBusinessSettings } from "@/lib/services/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Business details, tax and invoice numbering." />
      <Card title="Business" className="p-0">
        <div className="p-4 sm:p-6">
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <BusinessSettings />
          </Suspense>
        </div>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">System status</h2>
        <Suspense fallback={<DatabaseStatusSkeleton />}>
          <DatabaseStatus />
        </Suspense>
      </section>
    </>
  );
}

async function BusinessSettings() {
  await requireAdminPage();
  const settings = await readBusinessSettings();
  return (
    <SettingsForm
      nextInvoice={settings.nextInvoiceNumber}
      settings={{
        businessName: settings.businessName,
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        currencyCode: settings.currencyCode,
        taxRate: settings.taxRate.toFixed(2),
        invoicePrefix: settings.invoicePrefix,
      }}
    />
  );
}
