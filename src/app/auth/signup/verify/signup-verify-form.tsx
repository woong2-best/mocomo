"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { issueSignupHumanChallenge, registerUser } from "@/actions/auth";
import { SignupHumanChallenge } from "@/components/auth/signup-human-challenge";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { useLocale } from "@/components/providers/locale-provider";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { DEFAULT_GUEST_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";
import {
  clearSignupDraft,
  loadSignupDraft,
  saveSignupChallenge,
} from "@/lib/signup-draft";
import { saveSignupLocaleStorage, syncSignupLocaleClient } from "@/lib/signup-locale-sync";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";

export function SignupVerifyForm() {
  const router = useRouter();
  const { setLocale: syncProviderLocale } = useLocale();
  const [email, setEmail] = useState("");
  const [signupLocale, setSignupLocale] = useState<Locale | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<HumanChallengeQuestion | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [bootError, setBootError] = useState("");

  const t = useMemo(
    () => createTranslator(signupLocale ?? DEFAULT_GUEST_LOCALE),
    [signupLocale]
  );

  const loadChallenge = useCallback(async (draftLocale: Locale) => {
    const translate = createTranslator(draftLocale);
    try {
      const next = await issueSignupHumanChallenge(draftLocale);
      setChallenge(next);
      setSelectedId("");
      setError("");
      saveSignupChallenge(next, draftLocale);
    } catch {
      setBootError(translate("auth.challengeBootFailed"));
    }
  }, []);

  useEffect(() => {
    const draft = loadSignupDraft();
    if (!draft) {
      router.replace("/auth/signup/apply");
      return;
    }
    setEmail(draft.email);
    setSignupLocale(draft.locale);
    syncSignupLocaleClient(draft.locale, draft.countryCode);
    void syncProviderLocale(draft.locale, draft.countryCode);
    router.prefetch(
      `/auth/email-verify?email=${encodeURIComponent(draft.email)}&mode=signup`
    );
    void loadChallenge(draft.locale);
  }, [router, loadChallenge, syncProviderLocale]);

  async function handleContinue() {
    const draft = loadSignupDraft();
    if (!draft) {
      router.replace("/auth/signup/apply");
      return;
    }
    if (!challenge) {
      setError(t("auth.challengeLoading"));
      return;
    }
    if (!selectedId) {
      setError(t("auth.pickAnswer"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await registerUser({
        email: draft.email,
        username: draft.username,
        password: draft.password,
        name: draft.name,
        locale: draft.locale,
        countryCode: draft.countryCode,
        homeFloor: draft.homeFloor,
        availabilityPrechecked: true,
        humanChallengeToken: challenge.token,
        humanChallengeAnswer: selectedId,
        turnstileUnavailable: true,
      });

      if (result.error) {
        setError(result.error);
        const retry =
          result.error.includes("정답") ||
          result.error.includes("만료") ||
          result.error.toLowerCase().includes("correct") ||
          result.error.toLowerCase().includes("expired");
        if (retry) {
          await loadChallenge(draft.locale);
        }
        return;
      }

      if (result.needsVerification) {
        clearSignupDraft();
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, draft.password);
        saveSignupLocaleStorage(draft.locale);
        router.replace(
          `/auth/email-verify?email=${encodeURIComponent(draft.email)}&mode=signup&locale=${draft.locale}`
        );
        return;
      }
    } catch {
      setError(t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  }

  if (bootError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl">
          <CardContent className="pt-6 space-y-3 text-center text-sm">
            <p className="text-destructive">{bootError}</p>
            <Button type="button" className="rounded-xl" onClick={() => window.location.reload()}>
              {t("auth.reload")}
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/auth/signup/apply">{t("auth.backToSignup")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        {t("auth.challengePreparing")}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={56} priority />
          </div>
          <SignupStepIndicator step={2} locale={signupLocale ?? undefined} />
          <CardTitle className="text-2xl">{t("auth.humanCheckTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.humanCheckDesc", { email })}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupHumanChallenge
            challenge={challenge}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRefresh={() => signupLocale && void loadChallenge(signupLocale)}
            locale={signupLocale ?? undefined}
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={loading || !selectedId}
            onClick={() => void handleContinue()}
          >
            {loading ? t("auth.sendingVerifyEmail") : t("auth.submitSignupEmail")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/signup/apply" className="text-folk-cobalt hover:underline">
              {t("auth.editSignupInfo")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
