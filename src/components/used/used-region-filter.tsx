"use client";

import { KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import { usedShippingRegionLabel } from "@/lib/used-regions-global";
import { isKoreaUsedMarketCountry, isUsedShippingRegion } from "@/lib/used-regions-global";
import { listUsedCityOptions } from "@/lib/used-market-cities";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type UsedRegionFilterProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
  region?: string | null;
  sido?: string | null;
  onNavigate: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
  className?: string;
};

export function UsedRegionFilter({
  viewerCountryCode,
  region,
  sido,
  onNavigate,
  isPending,
  className,
}: UsedRegionFilterProps) {
  const { locale, t } = useLocale();
  const viewerCountry = viewerCountryCode.toUpperCase();
  const korea = isKoreaUsedMarketCountry(viewerCountry);
  const currentRegion = region ?? "";
  const currentSido = sido ?? "";
  const cities = listUsedCityOptions(viewerCountry);

  const selected = (() => {
    if (isUsedShippingRegion(currentRegion) || currentSido === "__shipping__") {
      return "__shipping__";
    }
    if (korea) {
      if (currentSido && currentSido !== "__shipping__") return currentSido;
      return KOREA_SIDO.find((s) => currentRegion.startsWith(`${s.short} `) || currentRegion === s.short)
        ?.id ?? "";
    }
    if (currentRegion && cities.some((c) => c.value.toLowerCase() === currentRegion.toLowerCase())) {
      return cities.find((c) => c.value.toLowerCase() === currentRegion.toLowerCase())!.value;
    }
    return currentRegion && !isUsedShippingRegion(currentRegion) ? currentRegion : "";
  })();

  function apply(updates: Record<string, string | null>) {
    onNavigate({ ...updates, country: viewerCountry });
  }

  const extraCurrent =
    !korea &&
    selected &&
    selected !== "__shipping__" &&
    !cities.some((c) => c.value === selected);

  return (
    <select
      className={cn(
        "h-[38px] min-w-0 w-full rounded-full border-[1.5px] border-border bg-card px-3 text-[13px] font-extrabold text-folk-cobalt",
        className
      )}
      value={selected}
      disabled={isPending}
      aria-label={t("used.s2dzhae")}
      onChange={(e) => {
        const id = e.target.value;
        if (!id) apply({ region: null, sido: null });
        else if (id === "__shipping__") apply({ region: USED_SHIPPING_REGION, sido: null });
        else if (korea) apply({ sido: id, region: null });
        else apply({ region: id, sido: null });
      }}
    >
      <option value="">{t("used.s2dzhae")}</option>
      {cities.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
      {extraCurrent ? <option value={selected}>{selected}</option> : null}
      <option value="__shipping__">{usedShippingRegionLabel(locale)}</option>
    </select>
  );
}
