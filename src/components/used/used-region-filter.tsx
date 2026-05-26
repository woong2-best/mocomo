"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { KOREA_SIDO, USED_SHIPPING_REGION, formatUsedRegion, getSigunguList } from "@/lib/korea-regions";

export function UsedRegionFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRegion = searchParams.get("region") ?? "";
  const currentSido = searchParams.get("sido") ?? "";

  function apply(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/used?${params.toString()}`);
  }

  const sidoId =
    currentRegion === USED_SHIPPING_REGION
      ? "__shipping__"
      : currentSido ||
        KOREA_SIDO.find((s) => currentRegion.startsWith(`${s.short} `))?.id ||
        "";

  const sigunguList = sidoId ? getSigunguList(sidoId) : [];
  const sigunguValue =
    currentRegion === USED_SHIPPING_REGION
      ? USED_SHIPPING_REGION
      : sidoId && currentRegion
        ? currentRegion.replace(`${KOREA_SIDO.find((s) => s.id === sidoId)?.short} `, "")
        : "";

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        className="h-9 rounded-lg border border-border bg-background text-xs px-2"
        value={sidoId || ""}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) apply({ region: null, sido: null });
          else if (id === "__shipping__") apply({ region: USED_SHIPPING_REGION, sido: null });
          else {
            const s = KOREA_SIDO.find((x) => x.id === id);
            const units = getSigunguList(id);
            if (s && units[0]) apply({ region: formatUsedRegion(s.short, units[0]), sido: null });
          }
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
          if (!unit || !sidoId || sidoId === "__shipping__") return;
          const s = KOREA_SIDO.find((x) => x.id === sidoId);
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
