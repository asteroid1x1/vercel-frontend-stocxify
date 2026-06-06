import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Guard Middleware
 *
 * Protects all /dashboard/* routes. Checks for the presence of an
 * `auth_token` cookie (set by the login page on success). If missing,
 * the user is redirected to /login.
 *
 * TOKEN FLOW:
 *   - Login page receives JWT from /auth/login → stores full token in
 *     localStorage (for API calls) AND sets a lightweight `auth_token`
 *     cookie (for this middleware to read server-side).
 *   - This cookie only signals "a session exists" — actual auth is
 *     validated by the backend on every API request via Bearer token.
 *   - On logout, both localStorage entry and cookie are cleared.
 */
export function proxy(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;

  // No token → redirect to login, preserving the intended destination
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/** Only apply guard to dashboard routes */
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
