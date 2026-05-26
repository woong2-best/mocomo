"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { COUNTRIES, LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";

export function LocaleSettingsForm({
  initialLocale,
  initialCountryCode,
}: {
  initialLocale: string;
  initialCountryCode: string;
}) {
  const { setLocale, t } = useLocale();
  const [locale, setLocaleValue] = useState(initialLocale);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    await setLocale(locale as (typeof LOCALES)[number], countryCode);
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settings.localeDesc")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">{t("settings.country")}</span>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameKo} ({c.code})
              </option>
            ))}
          </select>
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
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={loading} className="rounded-xl">
          {loading ? t("common.loading") : t("settings.save")}
        </Button>
        {saved && <span className="text-sm text-primary">{t("settings.saved")}</span>}
      </div>
    </div>
  );
}
