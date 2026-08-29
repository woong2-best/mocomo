"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { mobileAuthCompletePath, sanitizeMobileRedirectUri } from "@/lib/mobile-oauth-shared";
import { persistOAuthFlowIntent } from "@/lib/oauth-flow-cookie";
import { setAddAccountFlowCookie, withAddAccountQuery } from "@/lib/account-switch/add-account-flow";

export function SignupApplyForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  lineOAuth,
  naverOAuth,
  fromMobile = false,
  platform = "android",
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
  naverOAuth: boolean;
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
  const completeUrl = mobileAuthCompletePath(platform);
  const mobileQs = fromMobile
    ? `?from=mobile&platform=${platform}`
    : "";

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
              {t("auth.oauthSignupRequired")}
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
            callbackUrl={fromMobile ? completeUrl : undefined}
            googleOAuth={googleOAuth}
            discordOAuth={discordOAuth}
            twitterOAuth={twitterOAuth}
            lineOAuth={lineOAuth}
            naverOAuth={naverOAuth}
            fromMobile={fromMobile}
            platform={platform}
            addAccount={addAccount}
            mobileRedirectUri={sanitizeMobileRedirectUri(searchParams.get("redirect_uri"))}
            onGmailSignup={() => router.push(withAddAccountQuery(`/auth/signup/gmail${mobileQs}`, addAccount))}
            onNaverSignup={() => router.push(withAddAccountQuery(`/auth/signup/naver${mobileQs}`, addAccount))}
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
