"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { buttonClass } from "./components/ui";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm">
        The page couldn&apos;t be loaded. If this keeps happening, check that PostgreSQL is running
        (<code className="font-mono">npm run db:check</code>).
      </p>
      <button type="button" onClick={() => retry()} className={buttonClass("secondary")}>
        Try again
      </button>
    </div>
  );
}
