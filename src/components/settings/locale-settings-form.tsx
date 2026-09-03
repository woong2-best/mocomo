"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/providers/locale-provider";
import { LOCALE_LABELS, LOCALES, localeDisplayLabel, type Locale } from "@/lib/i18n/config";
import { CountrySelect } from "@/components/i18n/country-select";
import { Button } from "@/components/ui/button";
import {
  COMMON_TIMEZONES,
  listTimeZonesForPicker,
  normalizeTimeZone,
} from "@/lib/i18n/timezone";
import { prefetchLocaleTable } from "@/lib/i18n/messages";

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
  const [langQuery, setLangQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTzOptions(listTimeZonesForPicker());
  }, []);

  const options = useMemo(() => {
    if (tzOptions.includes(timeZone)) return tzOptions;
    return [timeZone, ...tzOptions];
  }, [timeZone, tzOptions]);

  const languageOptions = useMemo(() => {
    const q = langQuery.trim().toLowerCase();
    return LOCALES.filter((code) => {
      if (!q) return true;
      const label = localeDisplayLabel(code, uiLocale).toLowerCase();
      const native = LOCALE_LABELS[code]?.toLowerCase() ?? "";
      return code.toLowerCase().includes(q) || label.includes(q) || native.includes(q);
    });
  }, [langQuery, uiLocale]);

  async function save() {
    setLoading(true);
    setSaved(false);
    const tz = normalizeTimeZone(timeZone);
    const next = locale as Locale;
    prefetchLocaleTable(next);
    await setLocale(next, countryCode, tz);
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
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">{t("settings.language")}</span>
          <input
            type="search"
            value={langQuery}
            onChange={(e) => setLangQuery(e.target.value)}
            placeholder={t("settings.languageSearch")}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm mb-2"
          />
          <select
            value={locale}
            onChange={(e) => setLocaleValue(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
            size={Math.min(8, Math.max(4, languageOptions.length))}
          >
            {languageOptions.map((l) => (
              <option key={l} value={l}>
                {localeDisplayLabel(l, uiLocale)} ({l})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">{t("settings.timeZone")}</span>
        <select
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {options.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" onClick={save} disabled={loading}>
        {loading ? t("calendar.saving") : t("settings.save")}
      </Button>
      {saved ? <p className="text-sm text-emerald-600">{t("settings.saved")}</p> : null}
    </div>
  );
}
