import { redirect } from "next/navigation";
import { DEFAULT_LANDING_PATH, sanitizeMainSiteCallbackPath } from "@/lib/site-routes";

/** `/auth/login?redirect=` alias for the sign-in page. */
export default async function AuthLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const dest = sanitizeMainSiteCallbackPath(sp.callbackUrl || sp.redirect, DEFAULT_LANDING_PATH);
  redirect(`/auth/signin?callbackUrl=${encodeURIComponent(dest)}`);
}
