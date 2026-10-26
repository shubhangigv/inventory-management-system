import { ButtonLink } from "./components/ui";

// Addresses that match no page at all. A notFound() inside the app (e.g. a
// deleted product) uses app/(app)/not-found.tsx, which keeps the sidebar.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">This address doesn&apos;t exist.</p>
      <ButtonLink href="/" variant="secondary">
        Back to dashboard
      </ButtonLink>
    </main>
  );
}
