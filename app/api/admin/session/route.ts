import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { adminCookieNames } from "@/lib/admin/cookies";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(adminCookieNames.deviceId)?.value;

  if (!accessToken || !deviceId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let adminCheck: Response;
  try {
    adminCheck = await signedBackendFetch({
      baseUrl: backendUrls.user,
      path: "/admin/dashboard",
      method: "GET",
      accessToken,
      deviceId,
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Unable to verify admin session" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { authenticated: adminCheck.ok },
    { status: adminCheck.ok ? 200 : adminCheck.status }
  );
}
