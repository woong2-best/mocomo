"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isMobileOAuthProvider,
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  sanitizeMobileRedirectUri,
  type MobileOAuthProvider,
} from "@/lib/mobile-oauth-shared";

/**
 * Mobile app opens this page inside AuthSession.
 * Discord / LINE / X → NextAuth OAuth (same as web SocialAuthButtons).
 * Gmail / Naver signup → dedicated email forms (same as web).
 */
export function MobileOAuthStartClient({
  discordOAuth,
  twitterOAuth,
  lineOAuth,
}: {
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
}) {
  const params = useSearchParams();
  const [error, setError] = useState("");

  const provider = params.get("provider") ?? "";
  const mode = params.get("mode") === "signin" ? "signin" : "signup";
  const platform = params.get("platform") === "ios" ? "ios" : "android";
  const redirectUri = sanitizeMobileRedirectUri(params.get("redirect_uri"));

  const completeUrl = useMemo(() => {
    const q = new URLSearchParams({ platform, from: "mobile" });
    return `/auth/mobile/oauth/complete?${q}`;
  }, [platform]);

  useEffect(() => {
    if (!isMobileOAuthProvider(provider)) {
      setError("지원하지 않는 로그인 방식입니다.");
      return;
    }

    document.cookie = `${MOBILE_OAUTH_COOKIE}=1; Path=/; Max-Age=1800; SameSite=Lax`;
    if (redirectUri) {
      document.cookie = `${MOBILE_OAUTH_REDIRECT_COOKIE}=${encodeURIComponent(redirectUri)}; Path=/; Max-Age=1800; SameSite=Lax`;
    }

    const p = provider as MobileOAuthProvider;

    if (p === "gmail") {
      window.location.replace(
        mode === "signin"
          ? `/auth/signin?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(completeUrl)}`
          : `/auth/signup/gmail?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(completeUrl)}`
      );
      return;
    }

    if (p === "naver") {
      window.location.replace(
        mode === "signin"
          ? `/auth/signin?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(completeUrl)}`
          : `/auth/signup/naver?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(completeUrl)}`
      );
      return;
    }

    if (p === "discord" && !discordOAuth) {
      setError("Discord 로그인이 서버에 설정되지 않았습니다.");
      return;
    }
    if (p === "twitter" && !twitterOAuth) {
      setError("X 로그인이 서버에 설정되지 않았습니다.");
      return;
    }
    if (p === "line" && !lineOAuth) {
      setError("LINE 로그인이 서버에 설정되지 않았습니다.");
      return;
    }

    // Same as web SocialAuthButtons: signIn(providerId, { callbackUrl })
    void signIn(p, { callbackUrl: completeUrl }).catch(() => {
      setError("소셜 로그인을 시작하지 못했습니다. 다시 시도해 주세요.");
    });
  }, [
    provider,
    mode,
    platform,
    completeUrl,
    redirectUri,
    discordOAuth,
    twitterOAuth,
    lineOAuth,
  ]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">
            {error ? "로그인 오류" : "MoCoMo 앱 로그인"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground space-y-2">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <p>브라우저에서 인증을 계속합니다…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
