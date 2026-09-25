"use client";

import { useMemo, useState } from "react";
import {
  KOREA_SIDO,
  USED_SHIPPING_REGION,
  formatUsedRegion,
  getSigunguList,
  parseUsedRegion,
} from "@/lib/korea-regions";
import {
  defaultUsedRegionForCountry,
  isKoreaUsedMarketCountry,
  isUsedShippingRegion,
  usedShippingRegionLabel,
} from "@/lib/used-regions-global";
import { useLocale } from "@/components/providers/locale-provider";
import { CountrySelect } from "@/components/i18n/country-select";
import { Input } from "@/components/ui/input";

export function UsedRegionSelect({
  value,
  onChange,
  countryCode = "KR",
  onCountryChange,
  className,
}: {
  value: string;
  onChange: (region: string) => void;
  countryCode?: string;
  onCountryChange?: (code: string) => void;
  className?: string;
}) {
  const { locale } = useLocale();
  const cc = countryCode.toUpperCase();
  const shippingLabel = usedShippingRegionLabel(locale);
  const selectClass =
    className ?? "w-full h-11 rounded-xl border border-border px-3 text-sm bg-background";

  const parsed = useMemo(() => parseUsedRegion(value), [value]);
  const [sidoId, setSidoId] = useState(
    parsed?.sidoId === "__shipping__" ? "__shipping__" : parsed?.sidoId ?? KOREA_SIDO[0].id
  );
  const sigunguList = getSigunguList(sidoId);
  const [sigungu, setSigungu] = useState(parsed?.sigungu ?? sigunguList[0] ?? "");
  const sido = KOREA_SIDO.find((s) => s.id === sidoId);

  function changeCountry(next: string) {
    onCountryChange?.(next);
    onChange(defaultUsedRegionForCountry(next));
    if (isKoreaUsedMarketCountry(next)) {
      setSidoId(KOREA_SIDO[0].id);
      const first = getSigunguList(KOREA_SIDO[0].id)[0] ?? "";
      setSigungu(first);
    }
  }

  function applySido(nextId: string) {
    setSidoId(nextId);
    if (nextId === "__shipping__") {
      onChange(USED_SHIPPING_REGION);
      setSigungu(USED_SHIPPING_REGION);
      return;
    }
    const units = getSigunguList(nextId);
    const first = units[0] ?? "";
    setSigungu(first);
    const s = KOREA_SIDO.find((x) => x.id === nextId);
    if (s && first) onChange(formatUsedRegion(s.short, first));
  }

  function applySigungu(next: string) {
    setSigungu(next);
    if (sidoId === "__shipping__") {
      onChange(USED_SHIPPING_REGION);
      return;
    }
    if (sido) onChange(formatUsedRegion(sido.short, next));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">거래 국가</label>
        <CountrySelect
          value={cc}
          onChange={changeCountry}
          locale={locale}
          searchPlaceholder={locale === "en" ? "Search country" : "국가 검색"}
          className={selectClass}
        />
      </div>

      {isKoreaUsedMarketCountry(cc) ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">시·군·구</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className={selectClass} value={sidoId} onChange={(e) => applySido(e.target.value)}>
              {KOREA_SIDO.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value="__shipping__">전국 택배</option>
            </select>
            {sidoId !== "__shipping__" ? (
              <select
                className={selectClass}
                value={sigungu}
                onChange={(e) => applySigungu(e.target.value)}
              >
                {sigunguList.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            ) : (
              <div className={`${selectClass} flex items-center text-muted-foreground`}>전국 택배</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {locale === "en" ? "City" : locale === "ja" ? "市区町村" : "시·도시"}
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="global-region-mode"
                checked={isUsedShippingRegion(value)}
                onChange={() => onChange(shippingLabel)}
              />
              {shippingLabel}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="global-region-mode"
                checked={!isUsedShippingRegion(value)}
                onChange={() =>
                  onChange(
                    value && !isUsedShippingRegion(value) ? value : ""
                  )
                }
              />
              {locale === "en" ? "Meet in a city" : "직거래 도시"}
            </label>
            {!isUsedShippingRegion(value) ? (
              <Input
                value={isUsedShippingRegion(value) ? "" : value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={
                  locale === "en" ? "e.g. Los Angeles, Tokyo, London" : "예: Tokyo, London, New York"
                }
                className="rounded-xl h-11"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
