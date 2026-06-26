import { NextRequest, NextResponse } from "next/server";
import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";

/**
 * GET /api/public/analysts/check-username?username=...
 * Calls GET /users/public/analysts/check-username on the user-service.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.user,
      path: `/users/public/analysts/check-username?username=${encodeURIComponent(username)}`,
      method: "GET",
      deviceId: "public-request",
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[public/analysts/check-username] GET failed:", error);
    return NextResponse.json({ error: "Unable to reach user service" }, { status: 503 });
  }
}
