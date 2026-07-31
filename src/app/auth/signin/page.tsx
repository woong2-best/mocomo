import { Suspense } from "react";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { mobileAuthCompletePath } from "@/lib/mobile-oauth-shared";
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
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const fromMobile = sp.from === "mobile";
  const platform = sp.platform === "ios" ? "ios" : "android";
  const { googleOAuth, discordOAuth, twitterOAuth, lineOAuth } = getAuthConfigStatus();

  const callbackUrl =
    sp.callbackUrl?.trim() ||
    (fromMobile ? mobileAuthCompletePath(platform) : DEFAULT_LANDING_PATH);

  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <SignInForm
        googleOAuth={googleOAuth}
        discordOAuth={discordOAuth}
        twitterOAuth={twitterOAuth}
        lineOAuth={lineOAuth}
        callbackUrl={callbackUrl}
        initialEmail={sp.email?.trim() || ""}
        errorParam={sp.error ?? null}
        fromMobile={fromMobile}
        platform={platform}
      />
    </>
  );
}
