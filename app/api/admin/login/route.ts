import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { adminCookieNames, adminCookieOptions } from "@/lib/admin/cookies";
import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { rejectCrossOriginPost } from "@/lib/admin/csrf";

// PROD: per-IP rate limiting MUST be enforced by the edge proxy / WAF before
// requests reach this handler. The in-memory map below is a best-effort
// server-instance guard only; it does not survive restarts or scale across
// multiple instances.
const ipAttempts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 20;

function checkIpThrottle(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) return false;
  return true;
}

type BackendLoginResponse = {
  access_token?: string;
  refresh_token?: string;
  session_id?: string;
  user?: {
    user_id?: string;
  };
  error?: string;
  message?: string;
  code?: string;
};

const KNOWN_ERROR_CODES = new Set([
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_INACTIVE",
  "INVALID_SIGNATURE",
  "ADMIN_ACCESS_REQUIRED",
]);

async function readBackendJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function safeErrorResponse(data: BackendLoginResponse, httpStatus: number): NextResponse {
  const isKnown = Boolean(data.code && KNOWN_ERROR_CODES.has(data.code));
  if (!isKnown) {
    console.error("[admin-login] Upstream auth error:", {
      status: httpStatus,
      code: data.code,
      message: data.message,
    });
  }
  const payload = isKnown
    ? { error: data.error ?? data.message ?? "Authentication failed", code: data.code }
    : { error: "Unable to sign in", code: "AUTH_FAILED" };
  return NextResponse.json(payload, { status: httpStatus });
}

async function logAdminGateDenied({
  ip,
  email,
  deviceId,
  userId,
  dashboardStatus,
}: {
  ip: string;
  email: string;
  deviceId: string;
  userId?: string;
  dashboardStatus: number;
}): Promise<void> {
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret) {
    console.warn("[admin-login] INTERNAL_SECRET missing; admin gate denial not persisted", {
      ip,
      email,
      dashboardStatus,
    });
    return;
  }

  try {
    await fetch(`${backendUrls.auth}/auth/security/log-admin-denied`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        email,
        ip_address: ip,
        device_id: deviceId,
        user_id: userId,
        dashboard_status: dashboardStatus,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("[admin-login] Failed to persist admin gate denial", { error });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfRejection = rejectCrossOriginPost(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkIpThrottle(ip)) {
    console.warn("[admin-login] Rate limit hit", { ip });
    return NextResponse.json(
      { error: "Too many login attempts. Try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let credentials: { email?: string; password?: string };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body", code: "BAD_REQUEST" }, { status: 400 });
  }

  if (!credentials.email || !credentials.password) {
    return NextResponse.json(
      { error: "Email and password are required", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const deviceId =
    cookieStore.get(adminCookieNames.deviceId)?.value ?? `admin-web-${randomUUID()}`;

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
    return NextResponse.json(
      { error: "Unable to reach the auth service", code: "SERVICE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const loginData = await readBackendJson<BackendLoginResponse>(loginResponse);

  console.info("[admin-login] Login attempt", {
    ip,
    email: credentials.email.trim(),
    status: loginResponse.status,
    code: loginData.code,
  });

  if (!loginResponse.ok || !loginData.access_token) {
    return safeErrorResponse(loginData, loginResponse.status);
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
      body: loginData.refresh_token ? { refresh_token: loginData.refresh_token } : undefined,
    }).catch(() => undefined);

    return NextResponse.json(
      { error: "Unable to verify admin access", code: "SERVICE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  if (!adminCheck.ok) {
    console.warn("[admin-login] Admin gate denied", {
      ip,
      email: credentials.email.trim(),
      dashboardStatus: adminCheck.status,
    });

    await logAdminGateDenied({
      ip,
      email: credentials.email.trim(),
      deviceId,
      userId: loginData.user?.user_id,
      dashboardStatus: adminCheck.status,
    });

    await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/logout",
      method: "POST",
      accessToken: loginData.access_token,
      deviceId,
      body: loginData.refresh_token ? { refresh_token: loginData.refresh_token } : undefined,
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
  if (loginData.refresh_token) {
    response.cookies.set(adminCookieNames.refreshToken, loginData.refresh_token, {
      ...adminCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
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
