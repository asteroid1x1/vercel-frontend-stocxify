import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendUrls, forwardedIpHeaders, signedBackendFetch } from "@/lib/backend/index";
import { userCookieNames } from "@/lib/auth/cookies";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscription_id: string }> }
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(userCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(userCookieNames.deviceId)?.value ?? "user-web-unknown";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription_id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || !body.razorpay_payment_id || !body.razorpay_order_id || !body.razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  try {
    const backendResponse = await signedBackendFetch({
      baseUrl: backendUrls.subscription,
      path: `/subscriptions/${subscription_id}/verify-payment`,
      method: "POST",
      deviceId,
      accessToken,
      body,
      extraHeaders: forwardedIpHeaders(request),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("[trader/subscriptions/verify] POST signedBackendFetch failed:", error);
    return NextResponse.json({ error: "Unable to reach subscription service" }, { status: 503 });
  }
}
