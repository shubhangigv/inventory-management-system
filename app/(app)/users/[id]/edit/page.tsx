import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, TableSkeleton } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { getUser } from "@/lib/services/users";
import { resetPasswordAction, updateUserAction } from "../../actions";
import { ResetPasswordForm, UserForm } from "../../user-form";

export const metadata = { title: "Edit user" };

export default function EditUserPage({ params }: PageProps<"/users/[id]/edit">) {
  return (
    <Suspense fallback={<TableSkeleton rows={4} />}>
      <EditUser params={params} />
    </Suspense>
  );
}

async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdminPage();
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();
  const isSelf = user.id === me.id;

  return (
    <>
      <PageHeader title={`Edit ${user.name}`} back={{ href: "/users", label: "Users" }} />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card title="Details" className="self-start">
          <div className="p-4 sm:p-6">
            <UserForm
              action={updateUserAction.bind(null, id)}
              user={{ name: user.name, email: user.email, role: user.role, isActive: user.isActive }}
              isSelf={isSelf}
              cancelHref="/users"
            />
          </div>
        </Card>
        <Card title="Password" className="self-start">
          <div className="p-4 sm:p-6">
            {isSelf ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Change your own password on{" "}
                <Link href="/account" className="underline">
                  My account
                </Link>
                , where you confirm the current one first.
              </p>
            ) : (
              <ResetPasswordForm action={resetPasswordAction.bind(null, id)} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
