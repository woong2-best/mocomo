import { Suspense } from "react";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { MobileOAuthStartClient } from "./mobile-oauth-start-client";

export default function MobileOAuthStartPage() {
  const { googleOAuth, discordOAuth, twitterOAuth, lineOAuth } = getAuthConfigStatus();
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
          준비 중…
        </div>
      }
    >
      <MobileOAuthStartClient
        googleOAuth={googleOAuth}
        discordOAuth={discordOAuth}
        twitterOAuth={twitterOAuth}
        lineOAuth={lineOAuth}
      />
    </Suspense>
  );
}
