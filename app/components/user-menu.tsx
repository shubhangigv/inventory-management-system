import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { formatEnum } from "@/lib/format";
import { Badge, buttonClass } from "./ui";

/** Who is logged in, with links to their account and to log out. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2 border-zinc-200 md:flex-col md:items-stretch md:border-t md:pt-4 dark:border-zinc-800">
      <Link
        href="/account"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
        title="My account"
      >
        <UserRound className="size-4 shrink-0 text-zinc-500" aria-hidden />
        <span className="truncate font-medium">{user.name}</span>
        <Badge tone={user.role === "ADMIN" ? "blue" : "neutral"}>{formatEnum(user.role)}</Badge>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className={buttonClass("ghost", "w-full justify-start px-2")}>
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      </form>
    </div>
  );
}

/** Renders its children for admins only. Hiding UI is a convenience; actions still check. */
export async function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? children : null;
}
