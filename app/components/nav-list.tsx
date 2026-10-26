import Link from "next/link";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { cx } from "./ui";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/new", label: "New sale", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Stock history", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
] as const;

/** The most specific nav item that matches the path ("/sales/new" beats "/sales"). */
export function activeNavHref(pathname: string) {
  const matches = navItems.filter(({ href }) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

/** Plain links; NavLinks adds the active state on the client. Admin-only links are hidden from staff. */
export function NavList({ activeHref, isAdmin }: { activeHref: string | null; isAdmin: boolean }) {
  const items = navItems.filter((item) => isAdmin || !("adminOnly" in item));
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={href === activeHref ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              href === activeHref
                ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
