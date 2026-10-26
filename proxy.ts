import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// A quick first gate: without a session cookie, go to the login page.
// It only checks that the cookie exists (no database here), so it is NOT the
// security check. Pages and Server Actions verify the session themselves
// through lib/auth.ts.
export function proxy(request: NextRequest) {
  // Server Actions answer for themselves: requireUser() redirects properly,
  // which a redirect here would break for a form posted from an open page.
  if (request.cookies.has(SESSION_COOKIE) || request.headers.has("next-action")) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login page, Next.js internals and static files.
  matcher: ["/((?!login|_next/static|_next/image|favicon\\.ico).*)"],
};
