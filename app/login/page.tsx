import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { Skeleton } from "@/app/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { param } from "@/lib/search-params";
import { countUsers } from "@/lib/services/users";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Boxes className="size-8" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">Log in to Inventory</h1>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={<LoginSkeleton />}>
            <Login searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = param(await searchParams, "next");
  // Already logged in: nothing to do here.
  if (await getCurrentUser()) redirect("/");

  if ((await countUsers()) === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No accounts exist yet. Create the first admin from a terminal with{" "}
        <code className="font-mono">npm run db:create-admin</code>, then reload this page.
      </p>
    );
  }
  return <LoginForm next={next} />;
}

function LoginSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-9" />
    </div>
  );
}
