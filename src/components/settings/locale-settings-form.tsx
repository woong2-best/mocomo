"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/providers/locale-provider";
import { LOCALE_LABELS, LOCALES, localeDisplayLabel, type Locale } from "@/lib/i18n/config";
import { CountrySelect } from "@/components/i18n/country-select";
import { detectBrowserTimeZone } from "@/lib/i18n/timezone";
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
  const [langQuery, setLangQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const deviceTz = detectBrowserTimeZone() || initialTimeZone || "UTC";

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
    const tz = detectBrowserTimeZone();
    const next = locale as Locale;
    prefetchLocaleTable(next);
    await setLocale(next, countryCode, tz);
    await sessionState?.update?.();
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="crt-manpage space-y-4 rounded-2xl border-2 border-[#1a3d1a] bg-[#03140A] p-4 font-mono text-[#6CFF62] shadow-[0_0_24px_rgba(108,255,98,0.12)]">
      <p className="text-[11px] tracking-widest text-[#3E9A38]">
        TERMINAL — locale(1)
      </p>
      <p className="text-sm text-[#3E9A38]">{t("settings.localeDesc")}</p>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">LANGUAGE</span>
        <input
          type="search"
          value={langQuery}
          onChange={(e) => setLangQuery(e.target.value)}
          placeholder={t("settings.languageSearch")}
          className="mb-2 h-10 w-full rounded-none border border-[#1E5A1C] bg-[#021008] px-3 text-sm text-[#6CFF62] placeholder:text-[#1E5A1C] outline-none"
        />
        <div className="max-h-44 overflow-y-auto border border-[#1E5A1C]">
          {languageOptions.map((l) => {
            const active = locale === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLocaleValue(l)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  active ? "bg-[#0a2a10] font-semibold" : "hover:bg-[#06180c]"
                }`}
              >
                <span>
                  {active ? ">> " : "   "}
                  {localeDisplayLabel(l, uiLocale)}
                </span>
                <span className="text-xs text-[#3E9A38]">{l}</span>
              </button>
            );
          })}
        </div>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">COUNTRY</span>
        <CountrySelect
          value={countryCode}
          onChange={setCountryCode}
          locale={uiLocale}
          searchPlaceholder={t("settings.country")}
          className="h-10 w-full rounded-none border border-[#1E5A1C] bg-[#021008] px-3 text-sm text-[#6CFF62] placeholder:text-[#1E5A1C] outline-none"
          listClassName="max-h-44 overflow-y-auto border border-[#1E5A1C]"
          rowClassName="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-[#6CFF62] hover:bg-[#06180c]"
        />
      </label>

      <div className="space-y-1">
        <span className="text-sm font-medium">TIMEZONE</span>
        <p className="text-sm">
          {">> "}device {deviceTz}
        </p>
        <p className="text-xs text-[#3E9A38]">Uses this device clock. Not user-selectable.</p>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={loading}
        className="rounded-none border border-[#6CFF62] bg-transparent px-4 py-2 text-sm font-semibold text-[#6CFF62] hover:bg-[#0a2a10] disabled:opacity-50"
      >
        {loading ? t("calendar.saving") : t("settings.save")}
      </button>
      {saved ? <p className="text-sm text-[#6CFF62]">{t("settings.saved")}</p> : null}
    </div>
  );
}
