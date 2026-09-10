"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { KOREA_SIDO, USED_SHIPPING_REGION, formatUsedRegion, getSidoById, getSigunguList } from "@/lib/korea-regions";
import { isKoreaUsedMarketCountry, isUsedShippingRegion } from "@/lib/used-regions-global";
import { usedMarketPhoneCountryLabel } from "@/lib/used-phone-countries";
import { useLocale } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { ALLOWED_COUNTRIES } from "@/lib/i18n/countries";

type UsedRegionFilterProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
};

function countryLabel(code: string, locale: string): string {
  const row = ALLOWED_COUNTRIES.find((c) => c.code === code);
  if (!row) return code;
  if (locale === "en") return row.nameEn;
  return row.nameKo;
}

export function UsedRegionFilter({
  viewerCountryCode,
  viewerServiceRegion,
  onNavigate,
}: UsedRegionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const viewerCountry = viewerCountryCode.toUpperCase();
  const currentRegion = searchParams.get("region") ?? "";
  const currentSido = searchParams.get("sido") ?? "";

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

  if (!isKoreaUsedMarketCountry(viewerCountry)) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">
          {locale === "en"
            ? `Local listings in ${countryLabel(viewerCountry, locale)} only`
            : `${countryLabel(viewerCountry, locale)} 지역 중고만 표시됩니다`}
          {viewerServiceRegion
            ? locale === "en"
              ? ` · Service area: ${viewerServiceRegion}`
              : ` · 내 동네: ${viewerServiceRegion}`
            : null}
        </p>
        <Input
          className="h-9 rounded-lg text-xs"
          placeholder={locale === "en" ? "City or area (optional)" : "도시·지역 (선택)"}
          defaultValue={isUsedShippingRegion(currentRegion) ? "" : currentRegion}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = (e.target as HTMLInputElement).value.trim();
              apply({ region: v || null, sido: null });
            }
          }}
        />
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline"
          onClick={() => apply({ region: "Shipping", sido: null })}
        >
          {locale === "en" ? "Shipping only" : "택배 거래만"}
        </button>
        <p className="text-[10px] text-muted-foreground">
          {usedMarketPhoneCountryLabel(viewerCountry, locale)}
        </p>
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
      <p className="text-[10px] text-muted-foreground">
        {locale === "en" ? "Korea local listings only" : "한국 지역 중고만 표시됩니다"}
        {viewerServiceRegion
          ? locale === "en"
            ? ` · Service area: ${viewerServiceRegion}`
            : ` · 내 동네: ${viewerServiceRegion}`
          : null}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-9 rounded-lg border border-border bg-background text-xs px-2"
          value={sidoId || ""}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) apply({ region: null, sido: null });
            else if (id === "__shipping__") apply({ region: USED_SHIPPING_REGION, sido: null });
            else apply({ sido: id, region: null });
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
              apply({ sido: sidoId, region: null });
              return;
            }
            const s = getSidoById(sidoId);
            if (s) apply({ region: formatUsedRegion(s.short, unit), sido: null });
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
    </div>
  );
}
