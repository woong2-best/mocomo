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
  USED_GLOBAL_SHIPPING_REGION,
  usedShippingRegionLabel,
} from "@/lib/used-regions-global";
import { useLocale } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";

export function UsedRegionSelect({
  value,
  onChange,
  className,
  countryCode = "KR",
}: {
  value: string;
  onChange: (region: string) => void;
  className?: string;
  countryCode?: string;
}) {
  const { locale } = useLocale();
  const cc = countryCode.toUpperCase();
  const shippingLabel = usedShippingRegionLabel(locale);

  if (!isKoreaUsedMarketCountry(cc)) {
    const isShipping = isUsedShippingRegion(value);
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {locale === "en" ? "Trade area" : locale === "ja" ? "取引エリア" : "거래 지역"}
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="global-region-mode"
              checked={isShipping}
              onChange={() => onChange(shippingLabel)}
            />
            {shippingLabel}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="global-region-mode"
              checked={!isShipping}
              onChange={() =>
                onChange(
                  value && !isUsedShippingRegion(value)
                    ? value
                    : defaultUsedRegionForCountry(cc) === USED_GLOBAL_SHIPPING_REGION
                      ? ""
                      : defaultUsedRegionForCountry(cc)
                )
              }
            />
            {locale === "en" ? "City / area" : locale === "ja" ? "市区町村" : "도시·지역"}
          </label>
          {!isShipping ? (
            <Input
              value={isUsedShippingRegion(value) ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                locale === "en"
                  ? "e.g. Los Angeles, CA or Shibuya, Tokyo"
                  : "예: Tokyo Shibuya, London Camden"
              }
              className={className ?? "rounded-xl h-11"}
            />
          ) : null}
        </div>
      </div>
    );
  }

  const parsed = useMemo(() => parseUsedRegion(value), [value]);
  const [sidoId, setSidoId] = useState(
    parsed?.sidoId === "__shipping__" ? "__shipping__" : parsed?.sidoId ?? KOREA_SIDO[0].id
  );
  const sigunguList = getSigunguList(sidoId);
  const [sigungu, setSigungu] = useState(parsed?.sigungu ?? sigunguList[0] ?? "");
  const sido = KOREA_SIDO.find((s) => s.id === sidoId);

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

  const selectClass =
    className ?? "w-full h-11 rounded-xl border border-border px-3 text-sm bg-background";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">거래 지역</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select className={selectClass} value={sidoId} onChange={(e) => applySido(e.target.value)}>
          {KOREA_SIDO.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
          <option value="__shipping__">택배 거래</option>
        </select>

        {sidoId !== "__shipping__" ? (
          <select className={selectClass} value={sigungu} onChange={(e) => applySigungu(e.target.value)}>
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
      {sido && sidoId !== "__shipping__" && (
        <p className="text-xs text-muted-foreground">
          선택: {formatUsedRegion(sido.short, sigungu)}
        </p>
      )}
    </div>
  );
}
