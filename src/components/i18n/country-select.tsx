"use client";

import {
  ALLOWED_COUNTRY_REGIONS,
  countryDisplayName,
  regionLabel,
  type CountryLocale,
} from "@/lib/i18n/countries";

type CountrySelectProps = {
  value: string;
  onChange: (code: string) => void;
  locale: CountryLocale;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function CountrySelect({
  value,
  onChange,
  locale,
  disabled,
  className,
  id,
}: CountrySelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {ALLOWED_COUNTRY_REGIONS.map((region) => (
        <optgroup key={region.id} label={regionLabel(region, locale)}>
          {region.countries.map((country) => (
            <option key={country.code} value={country.code}>
              {countryDisplayName(country.code, locale)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
