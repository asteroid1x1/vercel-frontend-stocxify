import { NextRequest, NextResponse } from "next/server";

export function rejectCrossOriginPost(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const fetchMode = request.headers.get("sec-fetch-mode");

  // Case 1: Origin header is present and matches exactly.
  if (origin && origin === request.nextUrl.origin) {
    return null;
  }

  // Case 2: no Origin header, but Fetch Metadata proves a same-origin request.
  // Explicitly reject sec-fetch-site=none; non-browser clients can send that
  // without proving same-origin.
  if (!origin && fetchSite === "same-origin" && fetchMode === "same-origin") {
    return null;
  }

  return NextResponse.json({ error: "Invalid request origin", code: "FORBIDDEN" }, { status: 403 });
}
