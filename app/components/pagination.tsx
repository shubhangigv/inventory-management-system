import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/services/pagination";
import { toQueryString } from "@/lib/search-params";
import { buttonClass } from "./ui";

/** "Showing 26-50 of 120" with previous/next links that keep the current filters. */
export function Pagination({ pathname, filters, page, pageCount, total }: {
  pathname: string;
  filters: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (total === 0) return null;
  const href = (target: number) => `${pathname}${toQueryString({ ...filters, page: target > 1 ? target : undefined })}`;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-zinc-500">
      <p>
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>
      {pageCount > 1 && (
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={buttonClass("secondary")} aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden /> Previous
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link href={href(page + 1)} className={buttonClass("secondary")} aria-label="Next page">
              Next <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      )}
    </nav>
  );
}
