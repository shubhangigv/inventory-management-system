import { connection } from "next/server";
import { CircleCheck, CircleX } from "lucide-react";
import { prisma } from "@/lib/prisma";

// Runs on the server for every request and asks PostgreSQL who it is.
// It never sends the connection string or password to the browser.
async function getDatabaseInfo() {
  await connection(); // tells Next.js to run this at request time, not at build time
  try {
    const [info] = await prisma.$queryRaw<
      { database: string; version: string }[]
    >`SELECT current_database() AS database, current_setting('server_version') AS version`;
    return { ok: true as const, ...info };
  } catch (error) {
    // A warning (not an error) so the expected "no database yet" case
    // doesn't open the Next.js error overlay in development.
    const code = (error as { code?: string }).code ?? "unknown";
    console.warn(`Database check failed (${code}). Is PostgreSQL running?`);
    return { ok: false as const };
  }
}

export async function DatabaseStatus() {
  const db = await getDatabaseInfo();

  if (!db.ok) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <CircleX className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Database not connected</p>
          <p className="text-sm">
            Check that the PostgreSQL service is running and that DATABASE_URL in .env is correct,
            then run <code className="font-mono">npm run db:check</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
      <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Database connected</p>
        <p className="text-sm">
          Database <span className="font-mono">{db.database}</span> on PostgreSQL {db.version}
        </p>
      </div>
    </div>
  );
}

export function DatabaseStatusSkeleton() {
  return (
    <div className="h-[74px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  );
}
