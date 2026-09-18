"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { persistOAuthFlowIntent, setOAuthFlowCookieClient } from "@/lib/oauth-flow-cookie";
import { setAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { SignInAccountPicker } from "@/components/auth/signin-account-picker";
import { listSavedAccounts } from "@/lib/account-switch/client";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_PLATFORM_COOKIE,
  MOBILE_OAUTH_PROVIDER_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  mobileAuthCompletePath,
  readMobilePlatformCookie,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";
import { buildProviderSigninHref } from "@/lib/oauth-provider-signin-shared";

function safeCallbackUrl(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function SignInForm({
  googleOAuth,
  callbackUrl: callbackUrlProp,
  errorParam,
  reasonParam = null,
  intentSignup = false,
  fromMobile = false,
  platform = "android",
  addAccount = false,
  mobileRedirectUri: mobileRedirectUriProp = null,
  pickAccount = false,
  loggedOutUserId = null,
}: {
  googleOAuth: boolean;
  callbackUrl: string;
  errorParam?: string | null;
  reasonParam?: string | null;
  intentSignup?: boolean;
  fromMobile?: boolean;
  platform?: "android" | "ios";
  addAccount?: boolean;
  mobileRedirectUri?: string | null;
  pickAccount?: boolean;
  loggedOutUserId?: string | null;
}) {
  const { t, locale } = useLocale();
  const { data: session } = useSession();
  const callbackUrl = safeCallbackUrl(callbackUrlProp);
  const needsSignupNotice = reasonParam === "not_registered";
  const accountExistsNotice = reasonParam === "account_exists";
  const sameAccountNotice = reasonParam === "same_account";
  const oauthFailedNotice = reasonParam === "oauth_failed";

  const [cookieMobile, setCookieMobile] = useState(false);
  const [cookiePlatform, setCookiePlatform] = useState<"android" | "ios">(platform);
  const [cookieRedirectUri, setCookieRedirectUri] = useState<string | null>(null);
  const autoContinueRef = useRef(false);

  const isMobile = fromMobile || cookieMobile;
  const resolvedPlatform = fromMobile ? platform : cookiePlatform;
  const completeUrl = mobileAuthCompletePath(resolvedPlatform);
  const oauthCallbackUrl = isMobile ? completeUrl : callbackUrl;
  const mobileRedirectUri =
    sanitizeMobileRedirectUri(mobileRedirectUriProp) ?? cookieRedirectUri;

  // Prefer signup OAuth when joining, recovering from not_registered, or add-account.
  const oauthMode: "signup" | "signin" =
    intentSignup || needsSignupNotice || addAccount ? "signup" : "signin";

  const [showLoginForm, setShowLoginForm] = useState(
    () => !pickAccount || listSavedAccounts().length === 0
  );

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
    void persistOAuthFlowIntent(oauthMode).catch(() => undefined);
    if (addAccount) setAddAccountFlowCookie();
  }, [addAccount, oauthMode]);

  useEffect(() => {
    if (!addAccount || (!sameAccountNotice && !accountExistsNotice) || !session?.user?.id) return;
    void (async () => {
      const { signOutForAddAccount } = await import("@/lib/account-switch/sign-out-client");
      await signOutForAddAccount(session.user.id);
    })();
  }, [addAccount, sameAccountNotice, accountExistsNotice, session?.user?.id]);

  // App AuthSession: after Google sign-in hits not_registered, continue with signup OAuth.
  useEffect(() => {
    if (!isMobile || !needsSignupNotice || autoContinueRef.current || !googleOAuth) return;
    if (typeof window !== "undefined") {
      const onceKey = "mocomo_mobile_oauth_signup_continued";
      if (sessionStorage.getItem(onceKey) === "1") return;
      sessionStorage.setItem(onceKey, "1");
    }
    const provider = readCookie(MOBILE_OAUTH_PROVIDER_COOKIE);
    if (provider !== "google" && provider !== "gmail") return;

    autoContinueRef.current = true;
    setOAuthFlowCookieClient("signup");
    window.location.replace(
      buildProviderSigninHref("google", {
        flow: "signup",
        callbackUrl: completeUrl,
        addAccount,
        mobile: true,
        platform: resolvedPlatform,
        redirectUri: mobileRedirectUri,
      })
    );
  }, [
    isMobile,
    needsSignupNotice,
    googleOAuth,
    completeUrl,
    addAccount,
    resolvedPlatform,
    mobileRedirectUri,
  ]);

  const bannedNotice =
    errorParam === "banned"
      ? "이 계정은 이용이 제한되어 있습니다. 문의가 필요하면 운영자에게 연락해 주세요."
      : errorParam === "account_deleted"
        ? "탈퇴한 계정입니다. 복구 기간이 지났거나 영구 삭제되었습니다."
        : "";

  const callbackErrorMessage =
    errorParam === "Configuration"
      ? googleOAuth
        ? "서버 OAuth 설정 오류입니다. Vercel 환경 변수를 확인한 뒤 Redeploy 하세요."
        : "Google 로그인이 아직 설정되지 않았습니다. Vercel에 AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET을 추가하세요."
      : errorParam === "OAuthAccountNotLinked"
        ? "이 이메일은 다른 로그인 방식으로 가입되어 있습니다."
        : errorParam
          ? "로그인에 실패했습니다. 다시 시도해 주세요."
          : "";

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      {!showLoginForm ? (
        <SignInAccountPicker
          loggedOutUserId={loggedOutUserId}
          onShowSignInForm={() => setShowLoginForm(true)}
        />
      ) : (
        <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
              <BrandLogo size={48} priority />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                {t("auth.welcomeTitle", { brand: BRAND.name })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("auth.welcomeDesc")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {(bannedNotice || callbackErrorMessage) && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {bannedNotice || callbackErrorMessage}
              </p>
            )}
            {needsSignupNotice ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 dark:text-amber-100 dark:bg-amber-950/40 dark:border-amber-800/60">
                {isMobile
                  ? locale === "ko"
                    ? "아직 MoCoMo 계정이 없습니다. 가입을 이어서 진행합니다…"
                    : "No MoCoMo account yet — continuing signup…"
                  : t("auth.oauthSignupRequired")}
              </p>
            ) : null}
            {accountExistsNotice ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 dark:text-amber-100 dark:bg-amber-950/40 dark:border-amber-800/60">
                {t("auth.oauthAccountExistsAddExisting")}
              </p>
            ) : null}
            {sameAccountNotice ? (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {t("auth.oauthSameAccountSession")}
              </p>
            ) : null}
            {oauthFailedNotice ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {locale === "ko"
                  ? "인증에 실패했습니다. Google로 다시 시도해 주세요."
                  : "Authentication failed. Please try again with Google."}
              </p>
            ) : null}

            <SocialAuthButtons
              mode={oauthMode}
              callbackUrl={oauthCallbackUrl}
              googleOAuth={googleOAuth}
              fromMobile={isMobile}
              platform={resolvedPlatform}
              addAccount={addAccount}
              mobileRedirectUri={mobileRedirectUri}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
