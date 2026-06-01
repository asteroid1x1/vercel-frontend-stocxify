import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { backendUrls, signedBackendFetch } from "@/lib/admin/backend";
import { adminCookieNames, adminCookieOptions } from "@/lib/admin/cookies";

async function logout(): Promise<void> {
  "use server";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(adminCookieNames.deviceId)?.value;

  if (accessToken && deviceId) {
    await signedBackendFetch({
      baseUrl: backendUrls.auth,
      path: "/auth/logout",
      method: "POST",
      accessToken,
      deviceId,
    }).catch(() => undefined);
  }

  for (const name of Object.values(adminCookieNames)) {
    cookieStore.set(name, "", { ...adminCookieOptions, maxAge: 0 });
  }

  redirect("/admin/login");
}

export default async function AdminPage(): Promise<JSX.Element> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminCookieNames.accessToken)?.value;
  const deviceId = cookieStore.get(adminCookieNames.deviceId)?.value;

  if (!accessToken || !deviceId) {
    redirect("/admin/login");
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
    redirect("/admin/login");
  }

  if (!adminCheck.ok) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Stoxify Admin</h1>
          <p className="text-muted-foreground">Admin session is active.</p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
