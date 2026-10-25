import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { NavLinks } from "./components/nav-links";
import { NavList } from "./components/nav-list";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Inventory Management System", template: "%s · Inventory" },
  description: "Manage products, stock and sales",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans md:flex-row">
        <aside className="print-hidden border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 p-3 md:gap-6 md:p-4">
            <Link href="/" className="flex items-center gap-2 px-2 font-semibold tracking-tight">
              <Boxes className="size-5" aria-hidden />
              Inventory
            </Link>
            <nav aria-label="Main">
              {/* usePathname waits for the URL on dynamic routes; until then show the links without highlighting. */}
              <Suspense fallback={<NavList activeHref={null} />}>
                <NavLinks />
              </Suspense>
            </nav>
          </div>
        </aside>
        <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
