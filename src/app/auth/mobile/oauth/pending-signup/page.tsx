import { cookies } from "next/headers";
import {
  MOBILE_OAUTH_REDIRECT_COOKIE,
  MOBILE_SIGNUP_HANDOFF_COOKIE,
  buildMobileNeedsSignupRedirectUrl,
  openMobileOAuthHandoff,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-handoff";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileDeepLinkRedirect } from "../complete/mobile-deep-link-redirect";

/**
 * After Discord/X (etc.) OAuth finds no MoCoMo account, Auth.js lands here.
 * Deep-link back to the app with needsSignup so terms stay in native sheets.
 */
export default async function MobileOAuthPendingSignupPage() {
  const jar = await cookies();
  const sealed = jar.get(MOBILE_SIGNUP_HANDOFF_COOKIE)?.value;
  const redirectCookie = jar.get(MOBILE_OAUTH_REDIRECT_COOKIE)?.value;
  let redirectUri: string | null = null;
  if (redirectCookie) {
    try {
      redirectUri = sanitizeMobileRedirectUri(decodeURIComponent(redirectCookie));
    } catch {
      redirectUri = sanitizeMobileRedirectUri(redirectCookie);
    }
  }

  if (!sealed) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle>앱으로 돌아가 주세요</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            가입 인증이 만료되었습니다. MoCoMo 앱에서 다시 로그인해 주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  let redirectUrl: string;
  try {
    const payload = openMobileOAuthHandoff(sealed);
    if (!payload || payload.kind !== "needsSignup") throw new Error("bad_handoff");
    redirectUrl = buildMobileNeedsSignupRedirectUrl({
      provider: payload.provider,
      sub: payload.sub,
      profile: payload.profile,
      redirectUri,
    }).url;
  } catch {
    const base = redirectUri ?? "mocomo://oauth";
    const join = base.includes("?") ? "&" : "?";
    redirectUrl = `${base}${join}handoff=${encodeURIComponent(sealed)}`;
  }

  try {
    jar.delete(MOBILE_SIGNUP_HANDOFF_COOKIE);
  } catch {
    /* ignore */
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">앱으로 돌아가는 중</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <MobileDeepLinkRedirect url={redirectUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
