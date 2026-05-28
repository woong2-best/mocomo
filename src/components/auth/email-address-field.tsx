"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  SIGNUP_EMAIL_CUSTOM_DOMAIN,
  SIGNUP_EMAIL_DOMAINS,
  buildSignupEmail,
  parseSignupEmail,
} from "@/lib/signup-email-domains";

type EmailAddressFieldProps = {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
};

export function EmailAddressField({
  name = "email",
  defaultValue = "",
  required = true,
  disabled = false,
}: EmailAddressFieldProps) {
  const initial = useMemo(() => parseSignupEmail(defaultValue), [defaultValue]);
  const [localPart, setLocalPart] = useState(initial.localPart);
  const [domain, setDomain] = useState(initial.domain);
  const [customDomain, setCustomDomain] = useState(initial.customDomain);

  const isCustom = domain === SIGNUP_EMAIL_CUSTOM_DOMAIN;
  const fullEmail = buildSignupEmail(localPart, domain, customDomain) ?? "";

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">이메일</span>
      <div className="flex items-stretch gap-1.5">
        <Input
          type="text"
          inputMode="email"
          placeholder="아이디"
          value={localPart}
          onChange={(e) => setLocalPart(e.target.value)}
          autoComplete="username"
          disabled={disabled}
          required={required}
          aria-label="이메일 아이디"
          className="rounded-xl flex-1 min-w-0"
        />
        <span
          className="flex items-center px-0.5 text-lg font-medium text-muted-foreground shrink-0 select-none"
          aria-hidden
        >
          @
        </span>
        {isCustom ? (
          <Input
            type="text"
            inputMode="url"
            placeholder="mail.example.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            disabled={disabled}
            required={required}
            aria-label="이메일 도메인 직접 입력"
            className="rounded-xl flex-[1.15] min-w-0"
          />
        ) : (
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={disabled}
            required={required}
            aria-label="이메일 도메인 선택"
            className="h-10 flex-[1.15] min-w-0 rounded-xl border border-input bg-background px-2 text-sm"
          >
            {SIGNUP_EMAIL_DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({d.value})
              </option>
            ))}
            <option value={SIGNUP_EMAIL_CUSTOM_DOMAIN}>직접 입력</option>
          </select>
        )}
      </div>
      {isCustom ? (
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
          onClick={() => {
            setDomain(SIGNUP_EMAIL_DOMAINS[0].value);
            setCustomDomain("");
          }}
        >
          목록에서 도메인 선택
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
          onClick={() => setDomain(SIGNUP_EMAIL_CUSTOM_DOMAIN)}
        >
          목록에 없는 도메인 직접 입력
        </button>
      )}
      <input type="hidden" name={name} value={fullEmail} required={required} />
    </div>
  );
}
