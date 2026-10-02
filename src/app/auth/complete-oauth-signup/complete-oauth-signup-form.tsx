"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { completeWebOAuthSignup } from "@/actions/oauth-complete-signup";
import {
  SignupBirthDateFields,
  birthDateFieldsValid,
} from "@/components/auth/signup-birth-date-fields";
import {
  SignupTermsConsentFields,
  signupTermsConsentComplete,
} from "@/components/auth/signup-terms-consent-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  dest?: string;
  account: {
    email: string | null;
    name: string | null;
    image: string | null;
  };
};

export function CompleteOAuthSignupForm({ dest, account }: Props) {
  const { locale } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [birth, setBirth] = useState({ birthYear: "", birthMonth: "", birthDay: "" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signupTermsConsentComplete(termsAccepted, privacyAccepted)) {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    if (!birthDateFieldsValid(birth)) {
      setError(
        locale === "ko"
          ? "생년월일을 확인해 주세요. (연 4자리, 월·일 각 2자리)"
          : "Check your date of birth (4-digit year, 2-digit month and day)."
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await completeWebOAuthSignup({
        birthYear: Number(birth.birthYear),
        birthMonth: Number(birth.birthMonth),
        birthDay: Number(birth.birthDay),
        termsAccepted,
        privacyAccepted,
        dest,
      });
      if (result?.error) setError(errorText(result.error));
    } catch {
      setError("가입에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    locale === "ko"
      ? "회원가입 완료"
      : locale === "ja"
        ? "会員登録の完了"
        : "Finish signing up";

  const desc =
    locale === "ko"
      ? `${BRAND.name} 이용을 위해 생년월일과 약관 동의가 필요합니다. 입력하기 전에는 계정이 만들어지지 않습니다.`
      : locale === "ja"
        ? `${BRAND.name} のご利用には生年月日と規約同意が必要です。`
        : `Enter your date of birth and accept the terms to create your ${BRAND.name} account.`;

  const birthOk = birthDateFieldsValid(birth);
  const canSubmit =
    signupTermsConsentComplete(termsAccepted, privacyAccepted) && birthOk && !loading;

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#0f1a33] min-h-[60vh]">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="rounded-2xl bg-[#0f1a33] py-5 px-4">
            <AuthBrandWordmark className="mx-auto" />
          </div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
          {account.email || account.name ? (
            <p className="text-xs text-muted-foreground">
              {account.name ? `${account.name} · ` : ""}
              {account.email ?? ""}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignupBirthDateFields locale={locale} values={birth} onChange={setBirth} />
            <SignupTermsConsentFields
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onTermsChange={setTermsAccepted}
              onPrivacyChange={setPrivacyAccepted}
            />
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={!canSubmit}>
              {loading
                ? "…"
                : locale === "ko"
                  ? "동의하고 시작하기"
                  : locale === "ja"
                    ? "同意して始める"
                    : "Agree and join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
