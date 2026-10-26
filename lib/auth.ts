import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { createSession, deleteSession, validateSession } from "@/lib/services/sessions";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Who is logged in, for pages and Server Actions.
//
// proxy.ts only checks that a session cookie exists, to redirect quickly.
// The real check is here: every page's data component and every Server Action
// calls requireUser() or requireAdmin(). Server Actions can be called directly
// over HTTP, so hiding a button is never enough on its own.

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript in the page can't read it, so XSS can't steal it
    secure: process.env.NODE_ENV === "production", // HTTPS only (localhost dev uses http)
    sameSite: "lax", // not sent on cross-site form posts
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookieStore.delete(SESSION_COOKIE);
}

/** The current session, or null. Cached per request, so many components can ask for one query. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSession(token) : null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

/** The logged-in user; anyone else is sent to the login page. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/** For Server Actions: the user if they're an admin, otherwise an error the form shows. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN", "Only an admin can do this.");
  return user;
}

/** For admin pages: staff who type the address are sent to the dashboard. */
export async function requireAdminPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
