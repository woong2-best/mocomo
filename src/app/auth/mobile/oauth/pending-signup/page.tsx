import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { cookies } from "next/headers";
import {
  MOBILE_OAUTH_REDIRECT_COOKIE,
  MOBILE_SIGNUP_HANDOFF_COOKIE,
  buildMobileNeedsSignupRedirectUrl,
  openMobileOAuthHandoff,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-handoff";
import { BrandLogoLockup } from "@/components/brand/brand-logo-lockup";
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
            <CardTitle>{t("auth.s1h6tfqp")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            {t("auth.mocomo_3")}
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
          <BrandLogoLockup size={72} priority className="mx-auto" />
          <CardTitle className="text-xl font-semibold">{t("auth.s4pg14c")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <MobileDeepLinkRedirect url={redirectUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
