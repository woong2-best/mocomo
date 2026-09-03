"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ALLOWED_COUNTRIES } from "@/lib/i18n/countries";
import { filterOfacAllowedCountries } from "@/lib/compliance/ofac-sanctioned-countries";
import { KOREA_SIDO, USED_SHIPPING_REGION, formatUsedRegion, getSidoById, getSigunguList } from "@/lib/korea-regions";
import { isKoreaUsedMarketCountry, isUsedShippingRegion } from "@/lib/used-regions-global";
import { usedMarketPhoneCountryLabel } from "@/lib/used-phone-countries";
import { useLocale } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";

type UsedRegionFilterProps = {
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
};

const GLOBAL_COUNTRIES = filterOfacAllowedCountries(ALLOWED_COUNTRIES);

export function UsedRegionFilter({ onNavigate }: UsedRegionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const currentRegion = searchParams.get("region") ?? "";
  const currentSido = searchParams.get("sido") ?? "";
  const currentCountry = (searchParams.get("country") ?? "").toUpperCase();

  function apply(updates: Record<string, string | null>) {
    if (onNavigate) {
      onNavigate(updates);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.replace(`/used?${params.toString()}`);
  }

  if (currentCountry && !isKoreaUsedMarketCountry(currentCountry)) {
    return (
      <div className="space-y-2">
        <select
          className="h-9 rounded-lg border border-border bg-background text-xs px-2 w-full"
          value={currentCountry}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) apply({ country: null, region: null, sido: null });
            else apply({ country: next, region: null, sido: null });
          }}
        >
          <option value="">{locale === "en" ? "All countries" : "전체 국가"}</option>
          {GLOBAL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {locale === "ko" ? c.nameKo : c.nameEn}
            </option>
          ))}
        </select>
        <Input
          className="h-9 rounded-lg text-xs"
          placeholder={locale === "en" ? "City or area (optional)" : "도시·지역 (선택)"}
          defaultValue={isUsedShippingRegion(currentRegion) ? "" : currentRegion}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = (e.target as HTMLInputElement).value.trim();
              apply({ region: v || null, country: currentCountry || null, sido: null });
            }
          }}
        />
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline"
          onClick={() => apply({ region: "Shipping", country: currentCountry || null, sido: null })}
        >
          {locale === "en" ? "Shipping only" : "택배 거래만"}
        </button>
        {currentCountry ? (
          <p className="text-[10px] text-muted-foreground">
            {usedMarketPhoneCountryLabel(currentCountry, locale)}
          </p>
        ) : null}
      </div>
    );
  }

  const sidoId =
    currentRegion === USED_SHIPPING_REGION
      ? "__shipping__"
      : currentSido ||
        KOREA_SIDO.find((s) => currentRegion.startsWith(`${s.short} `))?.id ||
        "";

  const sido = getSidoById(sidoId);
  const sigunguList = sidoId ? getSigunguList(sidoId) : [];

  const sigunguValue = (() => {
    if (sidoId === "__shipping__") return "";
    if (!sidoId || !sido) return "";
    if (currentSido === sidoId && !currentRegion) return "";
    if (!currentRegion.startsWith(`${sido.short} `)) return "";
    const unit = currentRegion.slice(`${sido.short} `.length);
    return sigunguList.includes(unit) ? unit : "";
  })();

  return (
    <div className="space-y-2">
      <select
        className="h-9 rounded-lg border border-border bg-background text-xs px-2 w-full"
        value={currentCountry || ""}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) apply({ country: null, region: null, sido: null });
          else if (next === "KR") apply({ country: "KR", region: null, sido: null });
          else apply({ country: next, region: null, sido: null });
        }}
      >
        <option value="">{locale === "en" ? "All countries" : "전체 국가"}</option>
        {GLOBAL_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {locale === "ko" ? c.nameKo : c.nameEn}
          </option>
        ))}
      </select>

      {(!currentCountry || currentCountry === "KR") && (
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-lg border border-border bg-background text-xs px-2"
            value={sidoId || ""}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) apply({ region: null, sido: null, country: currentCountry || "KR" });
              else if (id === "__shipping__")
                apply({ region: USED_SHIPPING_REGION, sido: null, country: "KR" });
              else apply({ sido: id, region: null, country: "KR" });
            }}
          >
            <option value="">시·도 전체</option>
            {KOREA_SIDO.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
            <option value="__shipping__">전국 택배</option>
          </select>

          <select
            className="h-9 rounded-lg border border-border bg-background text-xs px-2"
            value={sigunguValue}
            disabled={!sidoId || sidoId === "__shipping__"}
            onChange={(e) => {
              const unit = e.target.value;
              if (!sidoId || sidoId === "__shipping__") return;
              if (!unit) {
                apply({ sido: sidoId, region: null, country: "KR" });
                return;
              }
              const s = getSidoById(sidoId);
              if (s) apply({ region: formatUsedRegion(s.short, unit), sido: null, country: "KR" });
            }}
          >
            <option value="">시·군·구 전체</option>
            {sigunguList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
