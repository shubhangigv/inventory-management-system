import Link from "next/link";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { Badge, buttonClass, Card, PageHeader, Table, TableSkeleton, Td, Th } from "@/app/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { formatEnum, formatNumber } from "@/lib/format";
import { listUsers } from "@/lib/services/users";
import { createUserAction } from "./actions";
import { UserForm } from "./user-form";

export const metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Who can log in, and what they're allowed to do." />
      <Suspense fallback={<Card><TableSkeleton /></Card>}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const me = await requireAdminPage();
  const users = await listUsers();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th align="right">Sales</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <Td>
                  <span className="font-medium">{user.name}</span>
                  {user.id === me.id && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                  <div className="text-xs text-zinc-500">{user.email}</div>
                </Td>
                <Td>
                  <Badge tone={user.role === "ADMIN" ? "blue" : "neutral"}>{formatEnum(user.role)}</Badge>
                </Td>
                <Td>
                  <Badge tone={user.isActive ? "green" : "red"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td align="right">{formatNumber(user._count.sales)}</Td>
                <Td align="right">
                  <Link href={`/users/${user.id}/edit`} className={buttonClass("ghost", "px-2")} aria-label={`Edit ${user.name}`} title="Edit">
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card title="New user" className="self-start">
        <div className="p-4">
          <UserForm action={createUserAction} />
        </div>
      </Card>
    </div>
  );
}
