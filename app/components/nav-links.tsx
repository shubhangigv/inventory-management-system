"use client";

import { usePathname } from "next/navigation";
import { activeNavHref, NavList } from "./nav-list";

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  return <NavList activeHref={activeNavHref(usePathname())} isAdmin={isAdmin} />;
}
