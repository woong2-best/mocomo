"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { BRAND } from "@/lib/brand";
import { loginErrorMessage } from "@/lib/auth-login-errors";
import { useLocale } from "@/components/providers/locale-provider";
import { persistOAuthFlowIntent, setOAuthFlowCookieClient } from "@/lib/oauth-flow-cookie";
import { setAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { SignInAccountPicker } from "@/components/auth/signin-account-picker";
import { listSavedAccounts } from "@/lib/account-switch/client";
import { waitForClientSession } from "@/lib/auth-session-retry";
import { finishAddAccountFlow } from "@/lib/account-switch/add-account-flow";
import {
  adminLogoutMfaAction,
  adminMfaAfterPasswordAction,
} from "@/actions/admin-security";
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
import { sanitizeMainSiteCallbackPath } from "@/lib/site-routes";

function safeCallbackUrl(raw: string): string {
  return sanitizeMainSiteCallbackPath(raw, "/");
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeLoginId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1).trim();
  return trimmed;
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
  const router = useRouter();
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

  const loginInputRef = useRef<HTMLInputElement>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(
    () => !pickAccount || listSavedAccounts().length === 0
  );

  const emailVerifyHref = isMobile
    ? `/auth/email-verify?from=mobile&platform=${resolvedPlatform}`
    : "/auth/email-verify";
  const forgotHref = isMobile
    ? `/auth/email-verify?from=mobile&platform=${resolvedPlatform}&mode=reset`
    : "/auth/email-verify?mode=reset";

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

  // Unregistered Google account → continue as signup (web + mobile).
  useEffect(() => {
    if (!needsSignupNotice || autoContinueRef.current || !googleOAuth) return;
    if (typeof window !== "undefined") {
      const onceKey = "mocomo_oauth_signup_continued";
      if (sessionStorage.getItem(onceKey) === "1") return;
      sessionStorage.setItem(onceKey, "1");
    }

    if (isMobile) {
      const provider = readCookie(MOBILE_OAUTH_PROVIDER_COOKIE);
      if (provider !== "google" && provider !== "gmail") return;
    }

    autoContinueRef.current = true;
    setOAuthFlowCookieClient("signup");
    window.location.replace(
      buildProviderSigninHref("google", {
        flow: "signup",
        callbackUrl: oauthCallbackUrl,
        addAccount,
        mobile: isMobile,
        platform: resolvedPlatform,
        redirectUri: mobileRedirectUri,
        // Reuse the Google account just selected — skip second picker.
        selectAccount: false,
      })
    );
  }, [
    needsSignupNotice,
    googleOAuth,
    isMobile,
    oauthCallbackUrl,
    addAccount,
    resolvedPlatform,
    mobileRedirectUri,
  ]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalized = normalizeLoginId(loginId);
    if (!normalized) {
      setLoading(false);
      return;
    }
    router.prefetch(callbackUrl);

    const result = await signIn("credentials", {
      email: normalized,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error || result?.ok === false) {
      const code =
        typeof result === "object" && result && "code" in result
          ? String((result as { code?: string }).code ?? "")
          : undefined;
      setError(loginErrorMessage(code || result?.error, result?.error ?? undefined));
      return;
    }

    const nextSession = await waitForClientSession();
    if (!nextSession?.user?.id) {
      setError(
        locale === "ko"
          ? "로그인 세션이 생성되지 않았습니다. 다시 시도해 주세요."
          : "Could not create a login session. Please try again."
      );
      return;
    }
    await finishAddAccountFlow();
    if (nextSession.user.isOperator) {
      await adminLogoutMfaAction();
      await adminMfaAfterPasswordAction();
    }
    window.location.assign(isMobile ? completeUrl : callbackUrl);
  }

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
            {(error || bannedNotice || callbackErrorMessage) && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error || bannedNotice || callbackErrorMessage}
              </p>
            )}
            {needsSignupNotice ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 dark:text-amber-100 dark:bg-amber-950/40 dark:border-amber-800/60">
                {locale === "ko"
                  ? "아직 MoCoMo 계정이 없습니다. 회원가입을 이어서 진행합니다…"
                  : "No MoCoMo account yet — continuing signup…"}
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

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {locale === "ko" ? "또는" : "or"}
                </span>
              </div>
            </div>

            <form onSubmit={handleCredentials} className="space-y-3">
              <Input
                ref={loginInputRef}
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t("auth.loginIdPlaceholder")}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                autoComplete="username"
                className="rounded-xl h-11"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordSimple")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="rounded-xl h-11 pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <Link href={emailVerifyHref} className="text-primary hover:underline">
                {t("auth.emailVerifyLink")}
              </Link>
              {" · "}
              <Link href={forgotHref} className="text-primary hover:underline">
                {t("auth.passwordResetTab")}
              </Link>
            </p>

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
