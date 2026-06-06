import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { adminCookieNames } from "@/lib/admin/cookies";
import { forwardedIpHeaders } from "@/lib/admin/server-session";

type BackendKey = keyof typeof backendUrls;

type TotalResponse = {
  total?: number;
};

type DashboardOverview = {
  users: {
    total?: number;
    active?: number;
    blocked?: number;
    kyc_pending?: number;
  };
  analysts: {
    total?: number;
    active?: number;
    pending_verification?: number;
  };
  trades: {
    total?: number;
    live?: number;
  };
  plans: {
    total?: number;
    active?: number;
  };
  subscriptions: {
    total?: number;
    active?: number;
  };
  generated_at: string;
};

async function fetchTotal(
  request: NextRequest,
  {
    accessToken,
    backend,
    deviceId,
    path,
    query,
  }: {
    accessToken: string;
    backend: BackendKey;
    deviceId: string;
    path: string;
    query?: Record<string, string | number | undefined>;
  }
): Promise<number | undefined> {
  try {
    const response = await signedBackendFetch({
      baseUrl: backendUrls[backend],
      path,
      method: "GET",
      accessToken,
      deviceId,
      query,
      extraHeaders: forwardedIpHeaders(request),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json().catch(() => ({}))) as TotalResponse;
    return typeof data.total === "number" ? data.total : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get(adminCookieNames.accessToken)?.value;
  const deviceId = store.get(adminCookieNames.deviceId)?.value;

  if (!accessToken || !deviceId) {
    return NextResponse.json(
      { error: "Admin session required", code: "NO_SESSION" },
      { status: 401 }
    );
  }

  const [
    usersTotal,
    usersActive,
    usersBlocked,
    usersKycPending,
    analystsTotal,
    analystsActive,
    analystsPendingVerification,
    tradesTotal,
    tradesLive,
    plansTotal,
    plansActive,
    subscriptionsTotal,
    subscriptionsActive,
  ] = await Promise.all([
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users",
      query: { limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users",
      query: { state: "ACTIVE", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users",
      query: { state: "BLOCKED", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users",
      query: { state: "KYC_PENDING", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users/analysts",
      query: { limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users/analysts",
      query: { state: "ACTIVE", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "user",
      deviceId,
      path: "/users/analysts",
      query: { state: "VERIFICATION_PENDING", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "trade",
      deviceId,
      path: "/trades",
      query: { limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "trade",
      deviceId,
      path: "/trades",
      query: { status: "LIVE", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "plan",
      deviceId,
      path: "/plans",
      query: { limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "plan",
      deviceId,
      path: "/plans",
      query: { is_active: "true", limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "subscription",
      deviceId,
      path: "/subscriptions",
      query: { limit: 1 },
    }),
    fetchTotal(request, {
      accessToken,
      backend: "subscription",
      deviceId,
      path: "/subscriptions",
      query: { status: "ACTIVE", limit: 1 },
    }),
  ]);

  const overview: DashboardOverview = {
    users: {
      total: usersTotal,
      active: usersActive,
      blocked: usersBlocked,
      kyc_pending: usersKycPending,
    },
    analysts: {
      total: analystsTotal,
      active: analystsActive,
      pending_verification: analystsPendingVerification,
    },
    trades: {
      total: tradesTotal,
      live: tradesLive,
    },
    plans: {
      total: plansTotal,
      active: plansActive,
    },
    subscriptions: {
      total: subscriptionsTotal,
      active: subscriptionsActive,
    },
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(overview);
}
