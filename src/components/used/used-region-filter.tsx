"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  KOREA_SIDO,
  USED_SHIPPING_REGION,
  formatUsedRegion,
  getSidoById,
  getSigunguList,
} from "@/lib/korea-regions";

type UsedRegionFilterProps = {
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
};

export function UsedRegionFilter({ onNavigate }: UsedRegionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRegion = searchParams.get("region") ?? "";
  const currentSido = searchParams.get("sido") ?? "";

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
  );
}
