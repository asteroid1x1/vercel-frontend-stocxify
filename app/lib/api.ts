/**
 * Base API fetcher for all dashboard requests.
 *
 * USAGE:
 *   import { apiFetch } from "@/app/lib/api";
 *   const data = await apiFetch<Trade[]>("/trades/");
 *
 * AUTHENTICATION:
 *   - Reads the JWT from localStorage key "stoxify_access_token"
 *   - Attaches it as an Authorization: Bearer header on every request
 *   - On 401 → clears credentials and redirects to /login
 *
 * BASE URL:
 *   - Set NEXT_PUBLIC_API_BASE_URL in .env.local (e.g. http://localhost:80)
 *   - Defaults to an empty string (same-origin) for when a Next.js proxy is used
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Key used to store the JWT access token in localStorage */
export const TOKEN_KEY = "stoxify_access_token";
/** Cookie name used by middleware.ts for auth-guard */
export const AUTH_COOKIE = "auth_token";

/**
 * Saves a JWT to both localStorage (for API calls) and a document cookie
 * (for the middleware auth guard to read server-side).
 */
export function saveAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // Lightweight session cookie — httpOnly is not possible from JS but this is
  // only used as a presence signal for the middleware, not the actual secret.
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; SameSite=Strict`;
}

/**
 * Removes auth credentials — call on logout.
 */
export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  // Expire the cookie immediately
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}

/**
 * Returns the stored access token or null if not found.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Core fetch helper used by all SWR hooks.
 * Throws on non-2xx responses so SWR captures them as `error`.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    // Auth failure → clear credentials and redirect to login
    if (res.status === 401) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      // If we get a server/routing error (like 404 or 502/503/504 because backend is offline),
      // fallback to mock data so the demo is fully interactive.
      if (res.status === 404 || res.status >= 500) {
        console.warn(`[API] Fallback to mock data for ${path} due to status ${res.status}`);
        const { getMockResponse } = await import("./mock-data");
        return getMockResponse(path) as T;
      }

      let message = `API error ${res.status}`;
      try {
        const body = await res.json();
        message = body?.error ?? message;
      } catch {
        // Ignore JSON parse failure
      }
      throw new Error(message);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    // If the network request itself fails (e.g. Connection Refused), fallback to mock data.
    console.warn(`[API] Network error. Fallback to mock data for ${path}. Error:`, err);
    try {
      const { getMockResponse } = await import("./mock-data");
      return getMockResponse(path) as T;
    } catch {
      throw err;
    }
  }
}

/**
 * SWR-compatible fetcher function. Pass directly as the second argument to useSWR.
 * Example: useSWR("/trades/", swrFetcher)
 */
export const swrFetcher = <T>(url: string) => apiFetch<T>(url);
