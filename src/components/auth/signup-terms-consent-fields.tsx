"use client";

import Link from "next/link";
import { SIGNUP_PRIVACY_PATH, SIGNUP_TERMS_PATH } from "@/lib/signup-legal-links";

type Props = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
};

function ConsentRow({
  checked,
  onChange,
  label,
  href,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <label className="flex items-start gap-2.5 text-[14px] leading-snug flex-1 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          (필수) {label}
        </span>
      </label>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-muted-foreground hover:text-primary shrink-0"
      >
        보기 ›
      </Link>
    </div>
  );
}

/** OAuth signup — two required consents; parent gates submit on both checked. */
export function SignupTermsConsentFields({
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
}: Props) {
  return (
    <div className="rounded-xl border border-border/80 divide-y divide-border/60 px-3">
      <ConsentRow
        checked={termsAccepted}
        onChange={onTermsChange}
        label="이용약관 동의"
        href={SIGNUP_TERMS_PATH}
      />
      <ConsentRow
        checked={privacyAccepted}
        onChange={onPrivacyChange}
        label="개인정보 처리방침 동의"
        href={SIGNUP_PRIVACY_PATH}
      />
    </div>
  );
}

export function signupTermsConsentComplete(termsAccepted: boolean, privacyAccepted: boolean): boolean {
  return termsAccepted && privacyAccepted;
}
