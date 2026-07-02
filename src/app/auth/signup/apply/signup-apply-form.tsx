"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, prepareSignupVerify } from "@/actions/auth";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { saveSignupDraft, saveSignupChallenge } from "@/lib/signup-draft";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { BRAND } from "@/lib/brand";
import { COUNTRIES, LOCALE_COOKIE, COUNTRY_COOKIE, LOCALE_LABELS, LOCALES, countryDisplayName } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/providers/locale-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { isValidSignupEmail } from "@/lib/signup-email-domains";
import { EmailAddressField } from "@/components/auth/email-address-field";

export function SignupApplyForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
}) {
  const router = useRouter();
  const { locale: initialLocale, countryCode: initialCountry, t } = useLocale();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [countryCode, setCountryCode] = useState(initialCountry);

  const showSocial = googleOAuth || discordOAuth || twitterOAuth;
  const needsHumanVerify = isSignupHumanVerifyRequired();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim().toLowerCase();
    if (!isValidSignupEmail(email)) {
      setError(t("auth.invalidEmail"));
      setLoading(false);
      return;
    }
    const password = form.get("password") as string;
    const username = ((form.get("username") as string) || "").trim().toLowerCase();
    const displayName = ((form.get("name") as string) || "").trim();

    if (
      containsForbiddenAdminSequence(username) ||
      (displayName && containsForbiddenAdminSequence(displayName))
    ) {
      setError(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
      document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;

      const check = await prepareSignupVerify({
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        website: (form.get("website") as string) || undefined,
      });

      if (!("ok" in check) || !check.ok) {
        const msg = "error" in check && check.error ? check.error : "가입 정보를 확인할 수 없습니다.";
        setError(msg);
        return;
      }

      if (check.message) setNotice(check.message);

      const draft = {
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        homeFloor: check.homeFloor,
      };

      if (needsHumanVerify) {
        saveSignupDraft(draft);
        if ("challenge" in check && check.challenge) {
          saveSignupChallenge(check.challenge);
        }
        router.prefetch("/auth/signup/verify");
        router.prefetch(
          `/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`
        );
        router.replace("/auth/signup/verify");
        return;
      }

      const result = await registerUser({
        ...draft,
        turnstileUnavailable: true,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsVerification) {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.push(`/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`);
      }
    } catch {
      setError(t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={56} priority />
          </div>
          <SignupStepIndicator step={1} />
          <CardTitle className="text-2xl">{t("auth.signupPageTitle", { brand: BRAND.name })}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.signupPageDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <EmailAddressField required />
            <Input
              name="username"
              placeholder={t("auth.username")}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="rounded-xl"
            />
            <Input
              name="name"
              placeholder={t("auth.displayName")}
              autoComplete="name"
              className="rounded-xl"
            />
            <Input
              name="password"
              type="password"
              placeholder={t("auth.password")}
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{t("auth.country")}</span>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryDisplayName(c.code, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{t("auth.language")}</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                >
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-hidden
            />

            {notice && (
              <p className="text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                {notice}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === "ko" ? (
                <>
                  회원가입 시{" "}
                  <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                    {t("legal.terms")}
                  </Link>
                  ,{" "}
                  <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                    {t("legal.privacy")}
                  </Link>
                  ,{" "}
                  <Link href="/legal/policy" className="text-primary hover:underline" target="_blank">
                    {t("legal.policy")}
                  </Link>
                  에 동의한 것으로 간주됩니다.
                </>
              ) : (
                t("auth.termsAgreement")
              )}
            </p>

            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading
                ? t("auth.checking")
                : needsHumanVerify
                  ? t("auth.nextHumanVerify")
                  : t("auth.submitSignupEmail")}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  {t("auth.orSocialSignup")}
                </div>
              </div>
              <div className="space-y-2">
                {discordOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => signIn("discord", { callbackUrl: DEFAULT_LANDING_PATH })}
                  >
                    {t("auth.signUpDiscord")}
                  </Button>
                )}
                {twitterOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-black hover:bg-neutral-800 text-white"
                    onClick={() => signIn("twitter", { callbackUrl: DEFAULT_LANDING_PATH })}
                  >
                    {t("auth.signUpTwitter")}
                  </Button>
                )}
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => signIn("google", { callbackUrl: DEFAULT_LANDING_PATH })}
                  >
                    {t("auth.signUpGoogle")}
                  </Button>
                )}
              </div>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.hasAccount")}{" "}
            <Link href="/auth/signin" className="text-folk-cobalt hover:underline font-medium">
              {t("auth.signinLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
