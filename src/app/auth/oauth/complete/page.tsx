import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { signupRedirectForUnregistered } from "@/lib/oauth-flow-cookie";

function safeDest(raw: string | undefined): string {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return DEFAULT_LANDING_PATH;
}

/** OAuth sign-in landing: session → dest, otherwise signup apply. */
export default async function OAuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  if (session?.user?.id) {
    redirect(safeDest(sp.dest));
  }

  redirect(signupRedirectForUnregistered());
}
