import { NextRequest } from "next/server";

import { proxyAdminRequest } from "@/lib/admin/proxy";

type RouteContext = { params: Promise<{ analystId: string }> };

// Analyst accounts share the User collection — state transitions use the same
// backend endpoint. The backend gates this on PWR_USER_STATE_CHANGE.
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { analystId } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as {
    new_state?: string;
    reason?: string;
  };

  return proxyAdminRequest({
    request,
    backend: "user",
    path: `/users/${encodeURIComponent(analystId)}/state`,
    body: {
      new_state: payload.new_state,
      reason: typeof payload.reason === "string" ? payload.reason.trim() : payload.reason,
    },
  });
}
