import { NextRequest, NextResponse } from "next/server";

import { adminCookieNames } from "@/lib/admin/cookies";

const isDevelopment = process.env.NODE_ENV === "development";

const adminHeaders = {
  "Cache-Control": "no-store, must-revalidate",
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withAdminHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(adminHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = Boolean(request.cookies.get(adminCookieNames.accessToken)?.value);

    if (!hasSession) {
      return withAdminHeaders(NextResponse.redirect(new URL("/admin/login", request.url)));
    }
  }

  return withAdminHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
