import "server-only";

import { buildSignedHeaders } from "@/lib/auth/signRequest";

const defaultTimeoutMs = Number(process.env.BACKEND_FETCH_TIMEOUT_MS ?? 10_000);

function getBackendUrl(envName: "AUTH_SERVICE_URL" | "USER_SERVICE_URL", fallback: string) {
  const value = process.env[envName];

  if (!value && process.env.NODE_ENV !== "development") {
    throw new Error(`${envName} is required outside of development.`);
  }

  return value ?? fallback;
}

export const backendUrls = {
  get auth() {
    return getBackendUrl("AUTH_SERVICE_URL", "http://localhost:8001");
  },
  get user() {
    return getBackendUrl("USER_SERVICE_URL", "http://localhost:8002");
  },
};

/**
 * Sends a signed JSON request to a backend service.
 * Signs path + querystring together so the signature is symmetric with what
 * the backend reconstructs from request.url. Callers MUST supply deviceId;
 * only the login route is allowed to mint a new device ID.
 */
export async function signedBackendFetch({
  baseUrl,
  path,
  method = "GET",
  body,
  accessToken,
  deviceId,
  query,
  timeoutMs = defaultTimeoutMs,
}: {
  baseUrl: string;
  path: string;
  method?: string;
  body?: unknown;
  accessToken?: string;
  deviceId: string;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}): Promise<Response> {
  const normalizedMethod = method.toUpperCase();
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query)
          .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  const fullPath = `${path}${qs}`;
  const bodyText =
    normalizedMethod === "GET" || normalizedMethod === "HEAD" ? "{}" : JSON.stringify(body ?? {});

  return fetch(`${baseUrl}${fullPath}`, {
    method: normalizedMethod,
    headers: buildSignedHeaders({
      method: normalizedMethod,
      path: fullPath,
      body: bodyText,
      deviceId,
      jwt: accessToken,
    }),
    body: normalizedMethod === "GET" || normalizedMethod === "HEAD" ? undefined : bodyText,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}
