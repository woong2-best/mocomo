"use client";

import { useMemo, useState } from "react";
import {
  ALLOWED_COUNTRIES,
  countryDisplayName,
  isSelectableCountryCode,
  type CountryLocale,
} from "@/lib/i18n/countries";

type CountrySelectProps = {
  value: string;
  onChange: (code: string) => void;
  locale: CountryLocale;
  disabled?: boolean;
  className?: string;
  id?: string;
  searchPlaceholder?: string;
  listClassName?: string;
  rowClassName?: string;
};

export function CountrySelect({
  value,
  onChange,
  locale,
  disabled,
  className,
  id,
  searchPlaceholder = "Search country",
  listClassName,
  rowClassName,
}: CountrySelectProps) {
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ALLOWED_COUNTRIES.filter((c) => isSelectableCountryCode(c.code));
    const filtered = !q
      ? list
      : list.filter((c) => {
          const ko = c.nameKo.toLowerCase();
          const en = c.nameEn.toLowerCase();
          const shown = countryDisplayName(c.code, locale).toLowerCase();
          return (
            c.code.toLowerCase().includes(q) ||
            ko.includes(q) ||
            en.includes(q) ||
            shown.includes(q)
          );
        });
    if (value && !filtered.some((c) => c.code === value)) {
      const current = list.find((c) => c.code === value);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [query, locale, value]);

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        autoComplete="off"
        className={className}
      />
      <div
        className={
          listClassName ??
          "max-h-44 overflow-y-auto rounded-xl border border-input bg-background"
        }
      >
        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
        ) : (
          options.map((country) => {
            const active = country.code === value;
            return (
              <button
                key={country.code}
                type="button"
                disabled={disabled}
                onClick={() => onChange(country.code)}
                className={
                  rowClassName ??
                  `flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                    active ? "bg-muted font-semibold" : "hover:bg-muted/70"
                  }`
                }
              >
                <span>
                  {active ? ">> " : "   "}
                  {countryDisplayName(country.code, locale)}
                </span>
                <span className="text-xs text-muted-foreground">{country.code}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
