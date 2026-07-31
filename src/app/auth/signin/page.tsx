import { Suspense } from "react";
import { cookies } from "next/headers";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  mobileAuthCompletePath,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-handoff";
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

async function persistMobileAuthCookies(sp: SearchParams) {
  if (sp.from !== "mobile") return;
  const jar = await cookies();
  jar.set(MOBILE_OAUTH_COOKIE, "1", { path: "/", maxAge: 1800, sameSite: "lax" });
  const redirectUri = sanitizeMobileRedirectUri(sp.redirect_uri);
  if (redirectUri) {
    jar.set(MOBILE_OAUTH_REDIRECT_COOKIE, encodeURIComponent(redirectUri), {
      path: "/",
      maxAge: 1800,
      sameSite: "lax",
    });
  }
  const platform = sp.platform === "ios" ? "ios" : "android";
  jar.set("mocomo_mobile_platform", platform, { path: "/", maxAge: 1800, sameSite: "lax" });
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const fromMobile = sp.from === "mobile";
  const platform = sp.platform === "ios" ? "ios" : "android";
  await persistMobileAuthCookies(sp);
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
