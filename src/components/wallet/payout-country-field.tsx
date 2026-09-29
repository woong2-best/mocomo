"use client";

import { useMemo } from "react";
import {
  DEFAULT_EXPRESS_PAYOUT_COUNTRY,
  listExpressPayoutCountries,
} from "@/lib/marketplace/stripe-supported-countries";

export function payoutCountryOptions() {
  return listExpressPayoutCountries().map((country) => ({
    code: country.code,
    label: country.name,
  }));
}

export function PayoutCountryField({
  value,
  onChange,
  id = "payout-country",
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
}) {
  const options = useMemo(() => payoutCountryOptions(), []);
  const selected = options.some((option) => option.code === value)
    ? value
    : DEFAULT_EXPRESS_PAYOUT_COUNTRY;

  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-sm font-semibold">정산받을 계좌 국가</span>
      <select
        id={id}
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="block text-xs text-muted-foreground leading-relaxed">
        은행 계좌가 있는 국가를 선택하세요. 한국에 거주해도 미국(US) 등 해외 계좌로 정산받을 수 있습니다.
      </span>
    </label>
  );
}
