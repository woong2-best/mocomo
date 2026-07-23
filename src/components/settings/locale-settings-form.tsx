"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/providers/locale-provider";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import { CountrySelect } from "@/components/i18n/country-select";
import { Button } from "@/components/ui/button";
import {
  COMMON_TIMEZONES,
  listTimeZonesForPicker,
  normalizeTimeZone,
} from "@/lib/i18n/timezone";

export function LocaleSettingsForm({
  initialLocale,
  initialCountryCode,
  initialTimeZone,
}: {
  initialLocale: string;
  initialCountryCode: string;
  initialTimeZone?: string;
}) {
  const { setLocale, t, locale: uiLocale } = useLocale();
  const sessionState = useSession();
  const [locale, setLocaleValue] = useState(initialLocale);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [timeZone, setTimeZone] = useState(normalizeTimeZone(initialTimeZone));
  const [tzOptions, setTzOptions] = useState<string[]>([...COMMON_TIMEZONES]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTzOptions(listTimeZonesForPicker());
  }, []);

  const options = useMemo(() => {
    if (tzOptions.includes(timeZone)) return tzOptions;
    return [timeZone, ...tzOptions];
  }, [timeZone, tzOptions]);

  async function save() {
    setLoading(true);
    setSaved(false);
    const tz = normalizeTimeZone(timeZone);
    await setLocale(locale as (typeof LOCALES)[number], countryCode, tz);
    await sessionState?.update?.();
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settings.localeDesc")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">{t("settings.country")}</span>
          <CountrySelect
            value={countryCode}
            onChange={setCountryCode}
            locale={uiLocale}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">{t("settings.language")}</span>
          <select
            value={locale}
            onChange={(e) => setLocaleValue(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">{t("settings.timeZone")}</span>
        <select
          value={timeZone}
          onChange={(e) => setTimeZone(normalizeTimeZone(e.target.value))}
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {options.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{t("settings.timeZoneHint")}</span>
      </label>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={loading} className="rounded-xl">
          {loading ? t("common.loading") : t("settings.save")}
        </Button>
        {saved && <span className="text-sm text-primary">{t("settings.saved")}</span>}
      </div>
    </div>
  );
}
