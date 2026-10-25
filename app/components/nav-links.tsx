"use client";

import { usePathname } from "next/navigation";
import { activeNavHref, NavList } from "./nav-list";

export function NavLinks() {
  return <NavList activeHref={activeNavHref(usePathname())} />;
}
