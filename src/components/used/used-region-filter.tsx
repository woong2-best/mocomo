"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import { usedShippingRegionLabel } from "@/lib/used-regions-global";
import { isKoreaUsedMarketCountry, isUsedShippingRegion } from "@/lib/used-regions-global";
import { listUsedCityOptions } from "@/lib/used-market-cities";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type UsedRegionFilterProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
  className?: string;
};

export function UsedRegionFilter({
  viewerCountryCode,
  onNavigate,
  isPending,
  className,
}: UsedRegionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const viewerCountry = viewerCountryCode.toUpperCase();
  const korea = isKoreaUsedMarketCountry(viewerCountry);
  const currentRegion = searchParams.get("region") ?? "";
  const currentSido = searchParams.get("sido") ?? "";
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
    const withCountry = { ...updates, country: viewerCountry };
    if (onNavigate) {
      onNavigate(withCountry);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(withCountry).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.replace(`/market?${params.toString()}`);
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
