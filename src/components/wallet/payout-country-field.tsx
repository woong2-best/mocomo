"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
      <span className="text-sm font-semibold">{t("wallet.s6oa0vj")}</span>
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
        {t("wallet.smzk6qg")}
      </span>
    </label>
  );
}
