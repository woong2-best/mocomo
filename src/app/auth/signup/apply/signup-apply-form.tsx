"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_PLATFORM_COOKIE,
  MOBILE_OAUTH_PROVIDER_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  mobileAuthCompletePath,
  readMobilePlatformCookie,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";
import { persistOAuthFlowIntent, setOAuthFlowCookieClient } from "@/lib/oauth-flow-cookie";
import { setAddAccountFlowCookie, withAddAccountQuery } from "@/lib/account-switch/add-account-flow";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function SignupApplyForm({
  googleOAuth,
  fromMobile = false,
  platform = "android",
}: {
  googleOAuth: boolean;
  fromMobile?: boolean;
  platform?: "android" | "ios";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t, locale } = useLocale();
  const needsSignupNotice = searchParams.get("reason") === "not_registered";
  const accountExistsNotice = searchParams.get("reason") === "account_exists";
  const sameAccountNotice = searchParams.get("reason") === "same_account";
  const addAccount = searchParams.get("addAccount") === "1";
  const [cookieMobile, setCookieMobile] = useState(false);
  const [cookiePlatform, setCookiePlatform] = useState<"android" | "ios">(platform);
  const [cookieRedirectUri, setCookieRedirectUri] = useState<string | null>(null);
  const autoContinueRef = useRef(false);

  const isMobile = fromMobile || cookieMobile;
  const resolvedPlatform = fromMobile ? platform : cookiePlatform;
  const completeUrl = mobileAuthCompletePath(resolvedPlatform);
  const mobileQs = isMobile ? `?from=mobile&platform=${resolvedPlatform}` : "";
  const mobileRedirectUri =
    sanitizeMobileRedirectUri(searchParams.get("redirect_uri")) ?? cookieRedirectUri;

  useEffect(() => {
    const hasMobileCookie = readCookie(MOBILE_OAUTH_COOKIE) === "1";
    if (hasMobileCookie) {
      setCookieMobile(true);
      setCookiePlatform(readMobilePlatformCookie(readCookie(MOBILE_OAUTH_PLATFORM_COOKIE)));
      const rawRedirect = readCookie(MOBILE_OAUTH_REDIRECT_COOKIE);
      if (rawRedirect) {
        try {
          setCookieRedirectUri(sanitizeMobileRedirectUri(decodeURIComponent(rawRedirect)));
        } catch {
          setCookieRedirectUri(sanitizeMobileRedirectUri(rawRedirect));
        }
      }
    }
  }, []);

  useEffect(() => {
    void persistOAuthFlowIntent("signup").catch(() => undefined);
    if (addAccount) setAddAccountFlowCookie();
  }, [addAccount]);

  useEffect(() => {
    if (!addAccount || (!sameAccountNotice && !accountExistsNotice) || !session?.user?.id) return;
    void (async () => {
      const { signOutForAddAccount } = await import("@/lib/account-switch/sign-out-client");
      await signOutForAddAccount(session.user.id);
    })();
  }, [addAccount, sameAccountNotice, accountExistsNotice, session?.user?.id]);

  // App AuthSession: after Google sign-in hits not_registered, continue gmail signup.
  useEffect(() => {
    if (!isMobile || !needsSignupNotice || autoContinueRef.current) return;
    if (typeof window !== "undefined") {
      const onceKey = "mocomo_mobile_oauth_signup_continued";
      if (sessionStorage.getItem(onceKey) === "1") return;
      sessionStorage.setItem(onceKey, "1");
    }
    const provider = readCookie(MOBILE_OAUTH_PROVIDER_COOKIE);
    if (provider !== "google" && provider !== "gmail") return;

    const redirectQs = mobileRedirectUri
      ? `&redirect_uri=${encodeURIComponent(mobileRedirectUri)}`
      : "";

    autoContinueRef.current = true;
    setOAuthFlowCookieClient("signup");
    window.location.replace(
      `/auth/signup/gmail?from=mobile&platform=${resolvedPlatform}${redirectQs}`
    );
  }, [isMobile, needsSignupNotice, resolvedPlatform, mobileRedirectUri]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {t("auth.signupPageTitle", { brand: BRAND.name })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("auth.signupOAuthDesc")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {needsSignupNotice ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
              {isMobile
                ? locale === "ko"
                  ? "아직 MoCoMo 계정이 없습니다. 가입을 이어서 진행합니다…"
                  : "No MoCoMo account yet — continuing signup…"
                : t("auth.oauthSignupRequired")}
            </p>
          ) : null}
          {accountExistsNotice ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
              {t("auth.oauthAccountExistsAddExisting")}
            </p>
          ) : null}
          {sameAccountNotice ? (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {t("auth.oauthSameAccountSession")}
            </p>
          ) : null}

          <SocialAuthButtons
            mode="signup"
            callbackUrl={isMobile ? completeUrl : undefined}
            googleOAuth={googleOAuth}
            fromMobile={isMobile}
            platform={resolvedPlatform}
            addAccount={addAccount}
            mobileRedirectUri={mobileRedirectUri}
            onGmailSignup={() =>
              router.push(withAddAccountQuery(`/auth/signup/gmail${mobileQs}`, addAccount))
            }
          />

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-1">
            {locale === "ko" ? (
              <>
                계속하면{" "}
                <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                  {t("legal.terms")}
                </Link>
                ,{" "}
                <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                  {t("legal.privacy")}
                </Link>
                에 동의한 것으로 간주됩니다.
              </>
            ) : (
              t("auth.termsAgreement")
            )}
          </p>

          <p className="text-center text-sm text-muted-foreground pt-1 border-t border-border">
            {t("auth.hasAccount")}{" "}
            <Link
              href={
                isMobile
                  ? `/auth/signin?from=mobile&platform=${resolvedPlatform}&callbackUrl=${encodeURIComponent(completeUrl)}`
                  : withAddAccountQuery("/auth/signin", addAccount)
              }
              className="text-primary hover:underline font-medium"
            >
              {t("auth.signinLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
