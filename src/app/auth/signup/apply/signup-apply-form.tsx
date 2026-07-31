"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { mobileAuthCompletePath } from "@/lib/mobile-oauth-handoff";

export function SignupApplyForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  lineOAuth,
  fromMobile = false,
  platform = "android",
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
  fromMobile?: boolean;
  platform?: "android" | "ios";
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const completeUrl = mobileAuthCompletePath(platform);
  const mobileQs = fromMobile
    ? `?from=mobile&platform=${platform}`
    : "";

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
          <SocialAuthButtons
            mode="signup"
            callbackUrl={fromMobile ? completeUrl : undefined}
            googleOAuth={googleOAuth}
            discordOAuth={discordOAuth}
            twitterOAuth={twitterOAuth}
            lineOAuth={lineOAuth}
            onGmailSignup={() => router.push(`/auth/signup/gmail${mobileQs}`)}
            onNaverSignup={() => router.push(`/auth/signup/naver${mobileQs}`)}
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
                fromMobile
                  ? `/auth/signin?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(completeUrl)}`
                  : "/auth/signin"
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
