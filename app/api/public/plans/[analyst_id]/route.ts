import { NextRequest, NextResponse } from "next/server";
import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";

/**
 * GET /api/public/plans/[analyst_id] — Fetch active plans/batches for an analyst.
 * Calls GET /plans/public/analysts/:analyst_id on the plan-service.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analyst_id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const analyst_id = resolvedParams.analyst_id;

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.plan,
      path: `/plans/public/analysts/${analyst_id}`,
      method: "GET",
      deviceId: "public-request",
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[public/plans] GET failed:", error);
    return NextResponse.json({ error: "Unable to reach plan service" }, { status: 503 });
  }
}
