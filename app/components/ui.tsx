import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small presentational building blocks shared by every page.
// No hooks here, so they work in both Server and Client Components.

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- Buttons ----------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    extra,
  );
}

export function ButtonLink({
  variant,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

// ---------- Inputs ----------

export const inputClass = cx(
  "block h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs",
  "placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:outline-none",
  "aria-invalid:border-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
);

export const textareaClass = cx(inputClass, "h-auto min-h-20 py-2");

// ---------- Layout ----------

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="print-hidden text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="print-hidden flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className }: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={cx(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

// ---------- Badges ----------

type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function StockBadge({ stock, reorderLevel, isActive = true }: {
  stock: number;
  reorderLevel: number;
  isActive?: boolean;
}) {
  if (!isActive) return <Badge>Inactive</Badge>;
  if (stock === 0) return <Badge tone="red">Out of stock</Badge>;
  if (stock <= reorderLevel) return <Badge tone="amber">Low stock</Badge>;
  return <Badge tone="green">In stock</Badge>;
}

// ---------- Tables ----------

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cx(
        "border-b border-zinc-200 px-4 py-2.5 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className }: {
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cx(
        "border-b border-zinc-100 px-4 py-2.5 align-middle dark:border-zinc-800/70",
        align === "right" && "text-right tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{children}</div>}
    </div>
  );
}

// ---------- Loading ----------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-6" />
      ))}
    </div>
  );
}
