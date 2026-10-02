"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/components/providers/locale-provider";
import { CountrySelect } from "@/components/i18n/country-select";
import { detectBrowserTimeZone } from "@/lib/i18n/timezone";

export function LocaleSettingsForm({
  initialCountryCode,
  initialTimeZone,
}: {
  initialCountryCode: string;
  initialTimeZone?: string;
}) {
  const { setLocale, t } = useLocale();
  const sessionState = useSession();
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const deviceTz = detectBrowserTimeZone() || initialTimeZone || "UTC";

  async function save() {
    setLoading(true);
    setSaved(false);
    const tz = detectBrowserTimeZone();
    await setLocale("en", countryCode, tz);
    await sessionState?.update?.();
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="crt-manpage space-y-4 rounded-2xl border-2 border-[#1a3d1a] bg-[#03140A] p-4 font-mono text-[#6CFF62] shadow-[0_0_24px_rgba(108,255,98,0.12)]">
      <p className="text-[11px] tracking-widest text-[#3E9A38]">TERMINAL — region(1)</p>
      <p className="text-sm text-[#3E9A38]">{t("settings.regionDesc")}</p>
      <p className="text-xs text-[#3E9A38]/90">{t("settings.englishBrowserTranslateHint")}</p>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">COUNTRY</span>
        <CountrySelect
          value={countryCode}
          onChange={setCountryCode}
          locale="en"
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
        {loading ? t("settings.saving") : t("settings.save")}
      </button>
      {saved ? <p className="text-xs text-[#6CFF62]">{t("settings.saved")}</p> : null}
    </div>
  );
}
