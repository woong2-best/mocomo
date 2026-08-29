"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { waitForClientSession } from "@/lib/auth-session-retry";
import {
  isStaleAddAccountSignupSession,
  readAddAccountSourceUserIdClient,
} from "@/lib/account-switch/add-account-flow";
import { signupRedirectForStaleSession } from "@/lib/oauth-flow-cookie";

/** Waits for client session hydration after OAuth redirect (mobile Safari cookie lag). */
export function OAuthCompleteClient({
  dest,
  signupUrl,
  addAccount = false,
  flow = "signin",
}: {
  dest: string;
  signupUrl: string;
  addAccount?: boolean;
  flow?: "signin" | "signup";
}) {
  const router = useRouter();
  const { status, data: session } = useSession();
  const resolvedRef = useRef(false);

  function resolveDestination(sessionUserId: string | undefined): string {
    const isSignupAddAccount = addAccount && flow === "signup";
    if (
      isSignupAddAccount &&
      sessionUserId &&
      isStaleAddAccountSignupSession(sessionUserId, readAddAccountSourceUserIdClient())
    ) {
      return signupRedirectForStaleSession(true);
    }
    return sessionUserId ? dest : signupUrl;
  }

  useEffect(() => {
    if (status === "loading" || resolvedRef.current) return;

    if (status === "authenticated") {
      resolvedRef.current = true;
      router.replace(resolveDestination(session?.user?.id));
      return;
    }

    let cancelled = false;
    void (async () => {
      const session = await waitForClientSession();
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      router.replace(resolveDestination(session?.user?.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, dest, signupUrl, router, addAccount, flow]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">잠시만 기다려 주세요</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          계정을 확인하는 중입니다…
        </CardContent>
      </Card>
    </div>
  );
}
