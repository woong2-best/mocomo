import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  signupRedirectForUnregistered,
  signupRedirectForStaleSession,
} from "@/lib/oauth-flow-cookie";
import {
  isStaleAddAccountSignupSession,
  readAddAccountSourceUserIdServer,
} from "@/lib/account-switch/add-account-flow";
import { OAuthCompleteClient } from "./oauth-complete-client";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return DEFAULT_LANDING_PATH;
}

function signupFallback(addAccount: boolean): string {
  if (addAccount) return signupRedirectForUnregistered(true);
  return "/auth/signup/apply?reason=oauth_failed";
}

/** OAuth landing — verified session → dest; otherwise signup apply. */
export default async function OAuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string; flow?: string; addAccount?: string }>;
}) {
  const sp = await searchParams;
  const dest = safeDest(sp.dest);
  const addAccount = sp.addAccount === "1";
  const isSignupAddAccount = addAccount && sp.flow === "signup";
  const signupUrl = signupFallback(addAccount);

  const session = await auth();
  if (session?.user?.id) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isBanned: true, deletedAt: true },
    });

    if (dbUser && !dbUser.isBanned && !dbUser.deletedAt) {
      if (isSignupAddAccount) {
        const sourceUserId = await readAddAccountSourceUserIdServer();
        if (isStaleAddAccountSignupSession(session.user.id, sourceUserId)) {
          redirect(signupRedirectForStaleSession(true));
        }
      }
      redirect(dest);
    }
  }

  // signin·signup 모두 클라이언트에서 세션 재확인 (모바일 OAuth 콜백 직후 서버 auth() 미스 방지)
  return (
    <OAuthCompleteClient
      dest={dest}
      signupUrl={signupUrl}
      addAccount={addAccount}
      flow={sp.flow === "signup" ? "signup" : "signin"}
    />
  );
}
