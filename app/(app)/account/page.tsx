import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/app/components/ui";
import { requireUser } from "@/lib/auth";
import { formatEnum } from "@/lib/format";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="My account" />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card title="Profile" className="self-start">
          <Suspense fallback={<Skeleton className="m-4 h-24" />}>
            <Profile />
          </Suspense>
        </Card>
        <Card title="Change password" className="self-start">
          <div className="p-4 sm:p-6">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </>
  );
}

async function Profile() {
  const user = await requireUser();
  return (
    <dl className="grid gap-4 p-4 text-sm sm:p-6">
      <div>
        <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
        <dd className="mt-0.5 font-medium">{user.name}</dd>
      </div>
      <div>
        <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
        <dd className="mt-0.5 font-medium">{user.email}</dd>
      </div>
      <div>
        <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
        <dd className="mt-0.5">
          <Badge tone={user.role === "ADMIN" ? "blue" : "neutral"}>{formatEnum(user.role)}</Badge>
        </dd>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {user.role === "ADMIN" ? "Edit names, emails and roles on the Users page." : "Ask an admin to change your name, email or role."}
      </p>
    </dl>
  );
}
