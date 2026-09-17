"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_PLATFORM_COOKIE,
  MOBILE_OAUTH_PROVIDER_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";
import { OAUTH_FLOW_COOKIE, persistOAuthFlowIntent } from "@/lib/oauth-flow-cookie";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Mobile app opens this page inside AuthSession.
 * Public auth is Google-only (gmail → NextAuth google / signup/gmail).
 */
export function MobileOAuthStartClient({ googleOAuth }: { googleOAuth: boolean }) {
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
    if (provider !== "gmail" && provider !== "google") {
      setError("Google 로그인만 지원합니다.");
      return;
    }

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${MOBILE_OAUTH_COOKIE}=1; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
    document.cookie = `${OAUTH_FLOW_COOKIE}=${mode}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
    document.cookie = `${MOBILE_OAUTH_PLATFORM_COOKIE}=${platform}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
    document.cookie = `${MOBILE_OAUTH_PROVIDER_COOKIE}=google; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
    void persistOAuthFlowIntent(mode).catch(() => undefined);
    if (redirectUri) {
      document.cookie = `${MOBILE_OAUTH_REDIRECT_COOKIE}=${encodeURIComponent(redirectUri)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
    }

    if (mode === "signin") {
      if (!googleOAuth) {
        setError("Google 로그인이 서버에 설정되지 않았습니다.");
        return;
      }
      const qs = new URLSearchParams({
        provider: "google",
        platform,
        flow: mode,
        callbackUrl: completeUrl,
      });
      if (redirectUri) qs.set("redirect_uri", redirectUri);
      window.location.replace(`/api/auth/mobile/provider-signin?${qs}`);
      return;
    }

    const gmailQs = new URLSearchParams({
      from: "mobile",
      platform,
      callbackUrl: completeUrl,
    });
    if (redirectUri) gmailQs.set("redirect_uri", redirectUri);
    window.location.replace(`/auth/signup/gmail?${gmailQs}`);
  }, [provider, mode, platform, completeUrl, redirectUri, googleOAuth]);

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
