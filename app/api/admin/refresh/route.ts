import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { adminCookieNames, adminCookieOptions } from "@/lib/admin/cookies";
import { rejectCrossOriginPost } from "@/lib/admin/csrf";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const reject = rejectCrossOriginPost(request);
  if (reject) return reject;

  const store = await cookies();
  const refreshToken = store.get(adminCookieNames.refreshToken)?.value;
  const deviceId = store.get(adminCookieNames.deviceId)?.value;

  if (!refreshToken || !deviceId) {
    return NextResponse.json({ ok: false, code: "NO_SESSION" }, { status: 401 });
  }

  let resp: Response | null = null;
  try {
    resp = await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/refresh",
      method: "POST",
      deviceId,
      body: { refresh_token: refreshToken },
    });
  } catch {
    return NextResponse.json({ ok: false, code: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  if (!resp.ok) {
    const res = NextResponse.json({ ok: false, code: "REFRESH_FAILED" }, { status: 401 });
    for (const name of Object.values(adminCookieNames)) {
      res.cookies.set(name, "", { ...adminCookieOptions, maxAge: 0 });
    }
    return res;
  }

  let data: { access_token?: string; refresh_token?: string };
  try {
    data = await resp.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_RESPONSE" }, { status: 502 });
  }

  if (!data.access_token) {
    return NextResponse.json({ ok: false, code: "REFRESH_FAILED" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieNames.accessToken, data.access_token, {
    ...adminCookieOptions,
    maxAge: 60 * 60,
  });
  if (data.refresh_token) {
    res.cookies.set(adminCookieNames.refreshToken, data.refresh_token, {
      ...adminCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
