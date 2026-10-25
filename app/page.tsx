import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { DatabaseStatus, DatabaseStatusSkeleton } from "./components/database-status";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <header className="flex items-center gap-3">
        <Boxes className="size-8 text-zinc-700 dark:text-zinc-300" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Management System</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Project setup: Next.js, Prisma 7 and local PostgreSQL
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">System status</h2>
        {/* The heading above renders instantly; the status streams in once the database answers. */}
        <Suspense fallback={<DatabaseStatusSkeleton />}>
          <DatabaseStatus />
        </Suspense>
      </section>
    </main>
  );
}
