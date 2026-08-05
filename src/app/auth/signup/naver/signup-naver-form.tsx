"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser, prepareSignupVerify } from "@/actions/auth";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { saveSignupDraft } from "@/lib/signup-draft";
import { saveSignupLocaleStorage, syncSignupLocaleClient } from "@/lib/signup-locale-sync";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { NaverLocalPartField } from "@/components/auth/naver-local-part-field";
import { BRAND } from "@/lib/brand";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";
import { CountrySelect } from "@/components/i18n/country-select";
import { useLocale } from "@/components/providers/locale-provider";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { buildNaverEmail, isValidNaverSignupEmail, parseNaverLocalPart } from "@/lib/signup-email-domains";
import {
  COMMON_TIMEZONES,
  detectBrowserRegionPrefs,
  listTimeZonesForPicker,
  normalizeTimeZone,
} from "@/lib/i18n/timezone";

export function SignupNaverForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    locale: initialLocale,
    countryCode: initialCountry,
    timeZone: initialTimeZone,
    t,
    setLocale: setProviderLocale,
  } = useLocale();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [countryCode, setCountryCode] = useState(initialCountry);
  const [timeZone, setTimeZone] = useState(normalizeTimeZone(initialTimeZone));
  const [tzOptions, setTzOptions] = useState<string[]>([...COMMON_TIMEZONES]);
  const [localPart, setLocalPart] = useState("");
  const [detectedOnce, setDetectedOnce] = useState(false);
  const [prefilledOnce, setPrefilledOnce] = useState(false);

  const needsSignupNotice = searchParams.get("reason") === "not_registered";

  useEffect(() => {
    if (prefilledOnce) return;
    const raw = searchParams.get("email")?.trim().toLowerCase();
    if (!raw) return;
    setPrefilledOnce(true);
    if (raw.includes("@")) {
      if (isValidNaverSignupEmail(raw)) setLocalPart(parseNaverLocalPart(raw));
      return;
    }
    setLocalPart(parseNaverLocalPart(raw));
  }, [prefilledOnce, searchParams]);

  useEffect(() => {
    if (needsSignupNotice) {
      setNotice(t("auth.oauthSignupRequired"));
    }
  }, [needsSignupNotice, t]);

  const needsHumanVerify = isSignupHumanVerifyRequired();

  useEffect(() => {
    if (detectedOnce) return;
    setDetectedOnce(true);
    const prefs = detectBrowserRegionPrefs();
    setTimeZone(prefs.timeZone);
    setLocale(prefs.locale);
    if (prefs.countryCode) setCountryCode(prefs.countryCode);
    setTzOptions(listTimeZonesForPicker());
    syncSignupLocaleClient(prefs.locale, prefs.countryCode ?? initialCountry, prefs.timeZone);
    void setProviderLocale(prefs.locale, prefs.countryCode ?? initialCountry, prefs.timeZone);
  }, [detectedOnce, initialCountry, setProviderLocale]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const normalized = buildNaverEmail(localPart);
    if (!normalized) {
      setError(t("auth.invalidNaver"));
      setLoading(false);
      return;
    }

    const form = new FormData(e.currentTarget);
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
      const tz = normalizeTimeZone(timeZone);
      syncSignupLocaleClient(locale, countryCode, tz);
      await setProviderLocale(locale, countryCode, tz);

      const check = await prepareSignupVerify({
        email: normalized,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        timeZone: tz,
        website: (form.get("website") as string) || undefined,
      });

      if (!("ok" in check) || !check.ok) {
        const msg = "error" in check && check.error ? check.error : t("auth.signupCheckFailed");
        setError(msg);
        return;
      }

      if (check.message) setNotice(check.message);

      const draft = {
        email: normalized,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        timeZone: tz,
        homeFloor: check.homeFloor,
      };

      if (needsHumanVerify) {
        saveSignupDraft(draft);
        if (typeof document !== "undefined") {
          const fromMobile = new URLSearchParams(window.location.search).get("from") === "mobile";
          if (fromMobile) {
            document.cookie = `mocomo_mobile_oauth=1; Path=/; Max-Age=1800; SameSite=Lax`;
          }
        }
        router.prefetch("/auth/signup/verify");
        router.prefetch(
          `/auth/email-verify?email=${encodeURIComponent(normalized)}&mode=signup&locale=${locale}`
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
        saveSignupLocaleStorage(locale);
        if (typeof document !== "undefined") {
          const fromMobile = new URLSearchParams(window.location.search).get("from") === "mobile";
          if (fromMobile) {
            document.cookie = `mocomo_mobile_oauth=1; Path=/; Max-Age=1800; SameSite=Lax`;
          }
        }
        const fromMobile =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("from") === "mobile";
        const platform =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("platform") === "ios"
            ? "ios"
            : "android";
        const mobileQs = fromMobile ? `&from=mobile&platform=${platform}` : "";
        router.push(
          `/auth/email-verify?email=${encodeURIComponent(normalized)}&mode=signup&locale=${locale}${mobileQs}`
        );
      }
    } catch {
      setError(t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <SignupStepIndicator step={1} locale={locale} />
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {t("auth.signupNaverTitle", { brand: BRAND.name })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("auth.signupNaverDesc")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-3">
            <NaverLocalPartField value={localPart} onChange={setLocalPart} required />
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
                <CountrySelect
                  value={countryCode}
                  onChange={(code) => {
                    setCountryCode(code);
                    syncSignupLocaleClient(locale, code, timeZone);
                    void setProviderLocale(locale, code, timeZone);
                  }}
                  locale={locale}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{t("auth.language")}</span>
                <select
                  value={locale}
                  onChange={(e) => {
                    const next = e.target.value as Locale;
                    setLocale(next);
                    syncSignupLocaleClient(next, countryCode, timeZone);
                    void setProviderLocale(next, countryCode, timeZone);
                  }}
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
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">{t("auth.timeZone")}</span>
              <select
                value={timeZone}
                onChange={(e) => {
                  const next = normalizeTimeZone(e.target.value);
                  setTimeZone(next);
                  syncSignupLocaleClient(locale, countryCode, next);
                  void setProviderLocale(locale, countryCode, next);
                }}
                className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
              >
                {!tzOptions.includes(timeZone) ? (
                  <option value={timeZone}>{timeZone}</option>
                ) : null}
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
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

            <p className="text-[11px] text-muted-foreground leading-relaxed">
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

          <p className="text-center text-sm text-muted-foreground pt-1 border-t border-border">
            <Link href="/auth/signup/apply" className="text-primary hover:underline">
              {t("auth.backToSignupMethods")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
