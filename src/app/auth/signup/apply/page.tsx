import { Suspense } from "react";
import { cookies } from "next/headers";
import { getAuthConfigStatus } from "@/lib/auth-env";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-handoff";
import { MobileAuthSessionBootstrap } from "@/components/auth/mobile-auth-session-bootstrap";
import { SignupApplyForm } from "./signup-apply-form";

type Sp = {
  from?: string;
  platform?: string;
  redirect_uri?: string;
};

async function persistMobileAuthCookies(sp: Sp) {
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

export default async function SignupApplyPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  const sp = await searchParams;
  const fromMobile = sp.from === "mobile";
  const platform = sp.platform === "ios" ? "ios" : "android";
  await persistMobileAuthCookies(sp);
  const { googleOAuth, discordOAuth, twitterOAuth, lineOAuth } = getAuthConfigStatus();

  return (
    <>
      <Suspense fallback={null}>
        <MobileAuthSessionBootstrap />
      </Suspense>
      <SignupApplyForm
        googleOAuth={googleOAuth}
        discordOAuth={discordOAuth}
        twitterOAuth={twitterOAuth}
        lineOAuth={lineOAuth}
        fromMobile={fromMobile}
        platform={platform}
      />
    </>
  );
}
