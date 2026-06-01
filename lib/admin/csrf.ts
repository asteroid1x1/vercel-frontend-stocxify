import { NextRequest, NextResponse } from "next/server";

export function rejectCrossOriginPost(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin === request.nextUrl.origin) {
    return null;
  }

  if (!origin && (fetchSite === "same-origin" || fetchSite === "none")) {
    return null;
  }

  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}
