"use client";

import { useState } from "react";
import Link from "next/link";
import { completeWebOAuthSignup } from "@/actions/oauth-complete-signup";
import { SignupBirthDateFields } from "@/components/auth/signup-birth-date-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
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
  const { locale, t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!termsAccepted || !privacyAccepted) {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const result = await completeWebOAuthSignup({
        birthYear: Number(form.get("birthYear")),
        birthMonth: Number(form.get("birthMonth")),
        birthDay: Number(form.get("birthDay")),
        termsAccepted,
        privacyAccepted,
        dest,
      });
      if (result?.error) setError(result.error);
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

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
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
            <SignupBirthDateFields locale={locale} />
            <label className="flex items-start gap-2 text-[13px] leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                (필수){" "}
                <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                  {t("legal.terms")}
                </Link>
                에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px] leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span>
                (필수){" "}
                <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                  {t("legal.privacy")}
                </Link>
                에 동의합니다.
              </span>
            </label>
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={loading || !termsAccepted || !privacyAccepted}
            >
              {loading ? "…" : locale === "ko" ? "동의하고 가입" : "Agree and join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
