"use client";

import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";

type EmailAddressFieldProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (email: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  locale?: Locale;
};

/** 비밀번호 찾기·이메일 인증용 단일 이메일 입력 */
export function EmailAddressField({
  name = "email",
  defaultValue = "",
  value,
  onChange,
  required = true,
  disabled = false,
  id,
  locale: localeOverride,
}: EmailAddressFieldProps) {
  const { t: ctxT } = useLocale();
  const t = localeOverride ? createTranslator(localeOverride) : ctxT;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id ?? name} className="text-xs text-muted-foreground">
        {t("auth.email")}
      </label>
      <Input
        id={id ?? name}
        name={name}
        type="email"
        inputMode="email"
        placeholder="you@gmail.com"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => onChange?.(e.target.value.trim().toLowerCase())}
        autoComplete="email"
        disabled={disabled}
        required={required}
        className="rounded-xl"
      />
    </div>
  );
}
