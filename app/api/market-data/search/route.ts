import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";
import { userCookieNames } from "@/lib/auth/cookies";

/**
 * GET /api/market-data/search?q=REL&limit=20
 *
 * Proxies symbol search to the backend market-data-service.
 * Returns `{ results: [{ symbol, token, exchange }, ...] }`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(userCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(userCookieNames.deviceId)?.value ?? "user-web-unknown";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "20";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.marketData,
      path: "/market-data/search",
      method: "GET",
      deviceId,
      accessToken,
      query: { q, limit },
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[market-data/search] signedBackendFetch failed:", error);
    return NextResponse.json({ error: "Unable to reach market data service" }, { status: 503 });
  }
}
