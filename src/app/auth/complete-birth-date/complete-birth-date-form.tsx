"use client";

import { useState } from "react";
import Link from "next/link";
import { completeBirthDateOnboarding } from "@/actions/birth-date-onboarding";
import { SignupBirthDateFields } from "@/components/auth/signup-birth-date-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";

export function CompleteBirthDateForm({ dest }: { dest?: string }) {
  const { locale, t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const birthYear = Number(form.get("birthYear"));
    const birthMonth = Number(form.get("birthMonth"));
    const birthDay = Number(form.get("birthDay"));

    try {
      const result = await completeBirthDateOnboarding({
        birthYear,
        birthMonth,
        birthDay,
        dest,
      });
      if (result?.error) setError(result.error);
    } catch {
      setError("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    locale === "ko"
      ? "생년월일 입력"
      : locale === "ja"
        ? "生年月日の入力"
        : "Date of birth";

  const desc =
    locale === "ko"
      ? `${BRAND.name} 이용을 위해 생년월일이 필요합니다. 성인 콘텐츠·유료 기능 연령 확인에 사용됩니다.`
      : locale === "ja"
        ? `${BRAND.name} のご利用には生年月日が必要です。`
        : `We need your date of birth to use ${BRAND.name} and verify age for mature content.`;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignupBirthDateFields locale={locale} />
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {locale === "ko" ? (
                <>
                  계속하면{" "}
                  <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                    {t("legal.terms")}
                  </Link>
                  의 연령·허위 정보 조항에 동의한 것으로 간주됩니다.
                </>
              ) : (
                t("auth.termsAgreement")
              )}
            </p>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "…" : locale === "ko" ? "저장하고 계속" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
