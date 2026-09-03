"use client";

import { Input } from "@/components/ui/input";

type Props = {
  locale: string;
  required?: boolean;
};

/** Global signup DOB — Y/M/D required for age-gating (stored as User.birthDate). */
export function SignupBirthDateFields({ locale, required = true }: Props) {
  const label =
    locale === "ko" ? "생년월일" : locale === "ja" ? "生年月日" : "Date of birth";
  const hint =
    locale === "ko"
      ? "허위 생년월일 기재 시 약관에 따라 계정이 제한될 수 있습니다."
      : locale === "ja"
        ? "虚偽の生年月日は利用規約に基づきアカウント制限の対象となります。"
        : "False date of birth may lead to account restrictions under our Terms of Service.";

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="grid grid-cols-3 gap-2">
        <Input
          name="birthYear"
          type="number"
          placeholder="YYYY"
          required={required}
          min={1900}
          max={new Date().getFullYear()}
          autoComplete="bday-year"
          className="rounded-xl"
        />
        <Input
          name="birthMonth"
          type="number"
          placeholder="MM"
          required={required}
          min={1}
          max={12}
          autoComplete="bday-month"
          className="rounded-xl"
        />
        <Input
          name="birthDay"
          type="number"
          placeholder="DD"
          required={required}
          min={1}
          max={31}
          autoComplete="bday-day"
          className="rounded-xl"
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}
