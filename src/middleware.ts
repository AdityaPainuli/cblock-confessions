import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the admin surface off the public hostname.
 *
 * With ADMIN_HOSTNAME set, /admin and the admin API answer 404 on the address
 * students use, and are served only on the admin hostname. That is obscurity
 * rather than a lock — the password is still what actually protects the panel —
 * but it takes the login form out of reach of anyone idly poking at the site or
 * scanning it, which is worth having.
 *
 * Unset, nothing changes and /admin works everywhere, so local development and
 * a fresh deployment behave as before.
 */
const ADMIN_HOST = process.env.ADMIN_HOSTNAME?.trim().toLowerCase();

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin");
}

export function middleware(req: NextRequest) {
  if (!ADMIN_HOST) return NextResponse.next();

  // Strip any port so localhost:3000 still matches a bare hostname.
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const path = req.nextUrl.pathname;

  if (host === ADMIN_HOST) {
    // The admin hostname exists to reach the panel, so send the root there.
    if (path === "/") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // Anywhere else, the panel does not exist. A 404 rather than a redirect, so
  // the response says nothing about where it moved to.
  if (isAdminPath(path)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "content-type": "text/plain", "x-robots-tag": "noindex" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models).*)"],
};
