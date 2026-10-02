"use client";

import { useState } from "react";
import { formatCoords } from "@/lib/apt/world/geo-math";
import { WORLD_COUNTRIES, findCountry } from "@/lib/apt/world/world-countries";

export type GlobePick = {
  country: { code: string; nameKo: string };
  lat: number;
  lng: number;
};

const ZOOM_LABELS = ["지구", "대륙", "국가", "부지"];

export function AptGlobePicker({
  initialCountryCode,
  onPick,
  onZoomChange,
}: {
  initialCountryCode?: string;
  onPick?: (pick: GlobePick) => void;
  onZoomChange?: (level: number) => void;
}) {
  const [pick, setPick] = useState<GlobePick | null>(null);
  const [zoom, setZoom] = useState(0);
  const selectedCountry = findCountry(initialCountryCode ?? pick?.country.code ?? "KR") ?? WORLD_COUNTRIES[0];

  const chooseCountry = (countryCode: string, index: number) => {
    const country = findCountry(countryCode) ?? selectedCountry;
    const nextZoom = Math.min(3, Math.max(1, zoom + 1));
    const nextPick: GlobePick = {
      country: { code: country.code, nameKo: country.nameKo },
      lat: country.lat + (index % 3) * 0.12,
      lng: country.lng + (index % 4) * 0.12,
    };
    setZoom(nextZoom);
    setPick(nextPick);
    onZoomChange?.(nextZoom);
    onPick?.(nextPick);
  };

  return (
    <div className="space-y-2">
      <div
        className="relative h-[min(52dvh,420px)] w-full overflow-hidden rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-100 p-4"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="relative grid h-full grid-cols-2 gap-3 sm:grid-cols-3">
          {WORLD_COUNTRIES.slice(0, 9).map((country, index) => (
            <button
              key={country.code}
              type="button"
              onClick={() => chooseCountry(country.code, index)}
              className="rounded-2xl border-2 border-slate-800/20 bg-white/80 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-folk-cobalt"
            >
              <p className="text-lg font-black text-folk-cobalt">{country.code}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{country.nameKo}</p>
              <p className="text-[10px] text-muted-foreground">{formatCoords(country.lat, country.lng)}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>2D 지도에서 위치 선택</span>
        <span className="rounded-full border border-[hsl(var(--folk-cobalt)/0.2)] px-2 py-0.5 font-medium">
          {ZOOM_LABELS[zoom] ?? "지구"} 뷰
        </span>
      </div>
      {pick && (
        <p className="text-center text-sm font-medium text-folk-cobalt">
          {pick.country.nameKo} · {formatCoords(pick.lat, pick.lng)}
        </p>
      )}
    </div>
  );
}
