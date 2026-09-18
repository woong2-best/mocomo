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

function isMobileHandoffDest(dest: string): boolean {
  return dest.startsWith("/auth/mobile/oauth/complete");
}

function signupFallback(addAccount: boolean, dest: string): string {
  if (isMobileHandoffDest(dest)) {
    const platform = dest.includes("platform=ios") ? "ios" : "android";
    return signupRedirectForUnregistered(addAccount, "oauth_failed", { platform });
  }
  if (addAccount) return signupRedirectForUnregistered(true);
  return "/auth/signin?intent=signup&reason=oauth_failed";
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
  const isSignup = sp.flow === "signup";
  const signupUrl = signupFallback(addAccount, dest);

  const session = await auth();
  if (session?.user?.id) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isBanned: true, deletedAt: true, birthDate: true, image: true },
    });

    if (dbUser && !dbUser.isBanned && !dbUser.deletedAt) {
      if (isSignupAddAccount) {
        const sourceUserId = await readAddAccountSourceUserIdServer();
        if (isStaleAddAccountSignupSession(session.user.id, sourceUserId)) {
          redirect(signupRedirectForStaleSession(true));
        }
      }
      // Web OAuth signup collects birth/avatar on the site. Mobile AuthSession
      // handoff returns to the app immediately — native onboarding covers gaps.
      if (!dbUser.birthDate && isSignup && !isMobileHandoffDest(dest)) {
        redirect(`/auth/complete-birth-date?dest=${encodeURIComponent(dest)}`);
      }
      if (isSignup && !isMobileHandoffDest(dest)) {
        redirect(`/auth/complete-role?dest=${encodeURIComponent(dest)}`);
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
      flow={isSignup ? "signup" : "signin"}
    />
  );
}
