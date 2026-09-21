import { Suspense } from "react";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { DEFAULT_LANDING_PATH, sanitizeMainSiteCallbackPath } from "@/lib/site-routes";
import { mobileAuthCompletePath, sanitizeMobileRedirectUri } from "@/lib/mobile-oauth-shared";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignInForm } from "./signin-form";

type SearchParams = {
  callbackUrl?: string;
  email?: string;
  error?: string;
  reset?: string;
  from?: string;
  platform?: string;
  redirect_uri?: string;
  addAccount?: string;
  pickAccount?: string;
  loggedOut?: string;
  reason?: string;
  intent?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const fromMobile = sp.from === "mobile";
  const platform = sp.platform === "ios" ? "ios" : "android";
  const { googleOAuth } = getAuthConfigStatus();

  const callbackUrl = fromMobile
    ? mobileAuthCompletePath(platform)
    : sanitizeMainSiteCallbackPath(sp.callbackUrl, DEFAULT_LANDING_PATH);

  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <SignInForm
        googleOAuth={googleOAuth}
        callbackUrl={callbackUrl}
        errorParam={sp.error ?? null}
        reasonParam={sp.reason?.trim() || null}
        intentSignup={sp.intent === "signup"}
        fromMobile={fromMobile}
        platform={platform}
        addAccount={sp.addAccount === "1"}
        mobileRedirectUri={sanitizeMobileRedirectUri(sp.redirect_uri)}
        pickAccount={sp.pickAccount === "1"}
        loggedOutUserId={sp.loggedOut?.trim() || null}
      />
    </>
  );
}
