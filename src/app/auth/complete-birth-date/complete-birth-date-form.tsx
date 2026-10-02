"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { completeBirthDateOnboarding } from "@/actions/birth-date-onboarding";
import {
  SignupBirthDateFields,
  birthDateFieldsValid,
} from "@/components/auth/signup-birth-date-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";

export function CompleteBirthDateForm({ dest }: { dest?: string }) {
  const { locale, t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [birth, setBirth] = useState({ birthYear: "", birthMonth: "", birthDay: "" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!birthDateFieldsValid(birth)) {
      setError(
        "Check your date of birth (4-digit year, 2-digit month and day)."
      );
      return;
    }
    setLoading(true);
    setError("");
    const birthYear = Number(birth.birthYear);
    const birthMonth = Number(birth.birthMonth);
    const birthDay = Number(birth.birthDay);

    try {
      const result = await completeBirthDateOnboarding({
        birthYear,
        birthMonth,
        birthDay,
        dest,
      });
      if (result?.error) setError(errorText(result.error));
    } catch {
      setError(t("auth.sxmv1y6"));
    } finally {
      setLoading(false);
    }
  }

  const title =
    "Date of birth";

  const desc =
    `We need your date of birth to use ${BRAND.name} and verify age for mature content.`;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <AuthBrandWordmark className="mx-auto" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignupBirthDateFields locale={locale} values={birth} onChange={setBirth} />
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {(
                t("auth.termsAgreement")
              )}
            </p>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
