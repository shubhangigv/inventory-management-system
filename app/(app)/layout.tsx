import Link from "next/link";
import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { NavLinks } from "@/app/components/nav-links";
import { NavList } from "@/app/components/nav-list";
import { UserMenu } from "@/app/components/user-menu";
import { getCurrentUser } from "@/lib/auth";

// The sidebar is only UI: it hides admin links from staff, but every page and
// action checks the user again (see lib/auth.ts).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="print-hidden border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-full flex-col gap-3 p-3 md:gap-6 md:p-4">
          <Link href="/" className="flex items-center gap-2 px-2 font-semibold tracking-tight">
            <Boxes className="size-5" aria-hidden />
            Inventory
          </Link>
          <nav aria-label="Main">
            {/* The user (and usePathname, on dynamic routes) are request data; until they
                arrive, show the links everyone sees, without highlighting. */}
            <Suspense fallback={<NavList activeHref={null} isAdmin={false} />}>
              <SessionNav />
            </Suspense>
          </nav>
          <div className="md:mt-auto">
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </aside>
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}

async function SessionNav() {
  const user = await getCurrentUser();
  return <NavLinks isAdmin={user?.role === "ADMIN"} />;
}
