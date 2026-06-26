import { NextRequest, NextResponse } from "next/server";
import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";

/**
 * GET /api/public/analysts/[username] — Fetch a public analyst profile.
 * Calls GET /users/public/analysts/:username on the user-service.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.user,
      path: `/users/public/analysts/${username}`,
      method: "GET",
      deviceId: "public-request", // Not strictly needed for public, but required by signedBackendFetch
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[public/analysts] GET failed:", error);
    return NextResponse.json({ error: "Unable to reach user service" }, { status: 503 });
  }
}
