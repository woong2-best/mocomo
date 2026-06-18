"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Hammer, Home, MapPin, Trees } from "lucide-react";
import type { AptProfileDto } from "@/actions/apt";
import { DEFAULT_HOUSE_FOOTPRINT_M2, metersToUnits } from "@/lib/apt/housing-types";
import { formatCoords } from "@/lib/apt/world/geo-math";
import { Button } from "@/components/ui/button";

const AptHouseScene = dynamic(
  () => import("@/components/apt/apt-house-scene").then((m) => m.AptHouseScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(70dvh,640px)] items-center justify-center rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-[hsl(var(--folk-cream)/0.4)] text-sm text-muted-foreground">
        부지 3D 불러오는 중…
      </div>
    ),
  }
);

export function AptHouseView({ profile }: { profile: AptProfileDto }) {
  const footprint = metersToUnits(Math.sqrt(DEFAULT_HOUSE_FOOTPRINT_M2));

  return (
    <div className="folk-card overflow-hidden">
      <div className="border-b border-[hsl(var(--folk-cobalt)/0.15)] bg-[hsl(var(--folk-cream)/0.5)] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Home className="h-4 w-4 text-folk-terracotta" />
          <span className="font-semibold text-folk-cobalt">{profile.regionLabel ?? "내 주택 부지"}</span>
        </div>
        {profile.latitude != null && profile.longitude != null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCoords(profile.latitude, profile.longitude)}
          </span>
        )}
      </div>

      <AptHouseScene
        lat={profile.latitude ?? 37.5}
        lng={profile.longitude ?? 127.0}
        footprintUnits={footprint}
        regionLabel={profile.regionLabel ?? ""}
      />

      <div className="grid gap-3 border-t border-[hsl(var(--folk-cobalt)/0.12)] p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><Trees className="h-3.5 w-3.5" /> 부지</p>
          <p className="text-muted-foreground">실제 비율 근사 · 약 {DEFAULT_HOUSE_FOOTPRINT_M2}㎡</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><Hammer className="h-3.5 w-3.5" /> 건설</p>
          <p className="text-muted-foreground">GTA5급 주택 건설 모드 준비 중</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> 위치</p>
          <p className="text-muted-foreground">{profile.countryCode} · 지구본 좌표 저장됨</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href="/apt/move-in">입주 설정</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-xl" disabled>
          건설 시작 (준비 중)
        </Button>
      </div>
    </div>
  );
}
