"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { setAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";

/** Persist mobile AuthSession markers from query (`from=mobile`, `redirect_uri`, `platform`). */
export function MobileAuthSessionBootstrap() {
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("from") !== "mobile") return;
    document.cookie = `${MOBILE_OAUTH_COOKIE}=1; Path=/; Max-Age=1800; SameSite=Lax`;
    const redirectUri = sanitizeMobileRedirectUri(params.get("redirect_uri"));
    if (redirectUri) {
      document.cookie = `${MOBILE_OAUTH_REDIRECT_COOKIE}=${encodeURIComponent(redirectUri)}; Path=/; Max-Age=1800; SameSite=Lax`;
    }
    const platform = params.get("platform") === "ios" ? "ios" : "android";
    document.cookie = `mocomo_mobile_platform=${platform}; Path=/; Max-Age=1800; SameSite=Lax`;

    if (params.get("addAccount") === "1") {
      setAddAccountFlowCookie();
    }
  }, [params]);

  return null;
}
