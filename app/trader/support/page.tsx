import { readUserSessionFromCookies } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

import { TraderSupport } from "@/components/trader/TraderSupport";

export const metadata = {
  title: "Help & Support — Stoxify",
  description: "Search frequently asked questions or raise a support ticket directly to our team.",
};

export default async function SupportPage() {
  const session = await readUserSessionFromCookies();

  if (!session.authenticated) {
    redirect("/");
  }

  return <TraderSupport user={session.user} />;
}
