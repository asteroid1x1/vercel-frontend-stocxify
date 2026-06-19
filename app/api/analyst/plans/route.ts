import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";
import { rejectCrossOriginPost } from "@/lib/auth/csrf";
import { userCookieNames } from "@/lib/auth/cookies";

/**
 * GET /api/analyst/plans — List the authenticated analyst's own subscription plans.
 * Passes analyst_id as a query param derived from the JWT (plan-service uses it
 * to scope results to the caller's own plans when they match).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(userCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(userCookieNames.deviceId)?.value ?? "user-web-unknown";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query: Record<string, string | undefined> = {
    analyst_id: searchParams.get("analyst_id") ?? undefined,
    segment: searchParams.get("segment") ?? undefined,
    is_active: searchParams.get("is_active") ?? undefined,
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "50",
  };

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.plan,
      path: "/plans/",
      method: "GET",
      deviceId,
      accessToken,
      query,
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[analyst/plans] GET failed:", error);
    return NextResponse.json({ error: "Unable to reach plan service" }, { status: 503 });
  }
}

/**
 * POST /api/analyst/plans — Create a new subscription plan.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfRejection = rejectCrossOriginPost(request);
  if (csrfRejection) return csrfRejection;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(userCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(userCookieNames.deviceId)?.value ?? "user-web-unknown";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.plan,
      path: "/plans/",
      method: "POST",
      deviceId,
      accessToken,
      body,
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[analyst/plans] POST failed:", error);
    return NextResponse.json({ error: "Unable to reach plan service" }, { status: 503 });
  }
}
