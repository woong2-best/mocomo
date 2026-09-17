"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { persistOAuthFlowIntent } from "@/lib/oauth-flow-cookie";
import { setAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { SignInAccountPicker } from "@/components/auth/signin-account-picker";
import { listSavedAccounts } from "@/lib/account-switch/client";

function safeCallbackUrl(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function SignInForm({
  googleOAuth,
  callbackUrl: callbackUrlProp,
  errorParam,
  fromMobile = false,
  platform = "android",
  addAccount = false,
  mobileRedirectUri = null,
  pickAccount = false,
  loggedOutUserId = null,
}: {
  googleOAuth: boolean;
  callbackUrl: string;
  errorParam?: string | null;
  fromMobile?: boolean;
  platform?: "android" | "ios";
  addAccount?: boolean;
  mobileRedirectUri?: string | null;
  pickAccount?: boolean;
  loggedOutUserId?: string | null;
}) {
  const { t } = useLocale();
  const callbackUrl = safeCallbackUrl(callbackUrlProp);
  const mobileQs = fromMobile ? `?from=mobile&platform=${platform}` : "";
  const signupHref = fromMobile
    ? `/auth/signup/apply${mobileQs}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/auth/signup";

  const [showLoginForm, setShowLoginForm] = useState(
    () => !pickAccount || listSavedAccounts().length === 0
  );

  useEffect(() => {
    void persistOAuthFlowIntent("signin").catch(() => undefined);
    if (addAccount) setAddAccountFlowCookie();
  }, [addAccount]);

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
                {t("auth.signInTitle", { brand: BRAND.name })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {(bannedNotice || callbackErrorMessage) && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {bannedNotice || callbackErrorMessage}
              </p>
            )}

            <SocialAuthButtons
              mode="signin"
              callbackUrl={callbackUrl}
              googleOAuth={googleOAuth}
              fromMobile={fromMobile}
              platform={platform}
              addAccount={addAccount}
              mobileRedirectUri={mobileRedirectUri}
            />

            <p className="text-center text-sm text-muted-foreground">
              <Link href={signupHref} className="text-primary hover:underline font-medium">
                {t("nav.signup")}
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
