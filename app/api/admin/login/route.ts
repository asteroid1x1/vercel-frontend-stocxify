import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { adminCookieNames, adminCookieOptions } from "@/lib/admin/cookies";
import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { rejectCrossOriginPost } from "@/lib/admin/csrf";

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  session_id?: string;
  error?: string;
  message?: string;
  code?: string;
};

async function readBackendJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfRejection = rejectCrossOriginPost(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  let credentials: { email?: string; password?: string };

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!credentials.email || !credentials.password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const deviceId = cookieStore.get(adminCookieNames.deviceId)?.value ?? `admin-web-${randomUUID()}`;

  let loginResponse: Response;
  try {
    loginResponse = await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/login",
      method: "POST",
      deviceId,
      body: {
        email: credentials.email.trim(),
        password: credentials.password,
        device_type: "WEB",
        device_name: "Stoxify Admin Console",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach the auth service" }, { status: 503 });
  }

  const loginData = await readBackendJson<LoginResponse>(loginResponse);

  if (!loginResponse.ok || !loginData.access_token) {
    return NextResponse.json(loginData, { status: loginResponse.status });
  }

  let adminCheck: Response;
  try {
    adminCheck = await signedBackendFetch({
      baseUrl: backendUrls.user,
      path: "/admin/dashboard",
      method: "GET",
      accessToken: loginData.access_token,
      deviceId,
    });
  } catch {
    await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/logout",
      method: "POST",
      accessToken: loginData.access_token,
      deviceId,
    }).catch(() => undefined);

    return NextResponse.json({ error: "Unable to verify admin access" }, { status: 503 });
  }

  if (!adminCheck.ok) {
    await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/logout",
      method: "POST",
      accessToken: loginData.access_token,
      deviceId,
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error: "This account does not have admin dashboard access.",
        code: "ADMIN_ACCESS_REQUIRED",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieNames.accessToken, loginData.access_token, {
    ...adminCookieOptions,
    maxAge: 60 * 60,
  });
  if (loginData.session_id) {
    response.cookies.set(adminCookieNames.sessionId, loginData.session_id, {
      ...adminCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  response.cookies.set(adminCookieNames.deviceId, deviceId, {
    ...adminCookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
