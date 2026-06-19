"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Car, DoorOpen, Hammer, Home, MapPin, Save, Trees, User } from "lucide-react";
import type { AptProfileDto } from "@/actions/apt";
import { saveAptHouseBuild } from "@/actions/apt";
import { emptyHouseBuild, seedFromCoords } from "@/lib/apt/house/build-types";
import type { HouseBuildState } from "@/lib/apt/house/build-types";
import { formatCoords } from "@/lib/apt/world/geo-math";
import { loadActiveVrm } from "@/lib/virtual-avatar/vrm-storage";
import { Button } from "@/components/ui/button";

const AptHouseScene = dynamic(
  () => import("@/components/apt/apt-house-scene").then((m) => m.AptHouseScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(75dvh,720px)] items-center justify-center rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-[hsl(var(--folk-cream)/0.4)] text-sm text-muted-foreground">
        오픈월드 불러오는 중…
      </div>
    ),
  }
);

export function AptHouseView({ profile }: { profile: AptProfileDto }) {
  const lat = profile.latitude ?? 37.5;
  const lng = profile.longitude ?? 127.0;
  const [vrmUrl, setVrmUrl] = useState<string | undefined>(profile.residents.find((r) => r.isOwner)?.vrmUrl);

  useEffect(() => {
    void (async () => {
      try {
        const slot = await loadActiveVrm();
        if (slot?.blob) setVrmUrl(URL.createObjectURL(slot.blob));
      } catch {
        /* default */
      }
    })();
  }, []);

  const initialBuild = useMemo<HouseBuildState>(() => {
    if (profile.houseBuild?.pieces) return profile.houseBuild;
    return emptyHouseBuild(undefined, seedFromCoords(lat, lng));
  }, [profile.houseBuild, lat, lng]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBuild = useRef(initialBuild);
  const [pieceCount, setPieceCount] = useState(initialBuild.pieces.length);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onBuildChange = useCallback((state: HouseBuildState) => {
    latestBuild.current = state;
    setPieceCount(state.pieces.length);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveAptHouseBuild(state);
      setSaving(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }, 1200);
  }, []);

  const manualSave = async () => {
    setSaving(true);
    await saveAptHouseBuild(latestBuild.current);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="folk-card overflow-hidden">
      <div className="border-b border-[hsl(var(--folk-cobalt)/0.15)] bg-[hsl(var(--folk-cream)/0.5)] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Home className="h-4 w-4 text-folk-terracotta" />
          <span className="font-semibold text-folk-cobalt">{profile.regionLabel ?? "내 주택 부지"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatCoords(lat, lng)}</span>
          <span>· 블록 {pieceCount}개</span>
          {vrmUrl && <span className="text-folk-cobalt flex items-center gap-0.5"><User className="h-3 w-3" /> VRM</span>}
          {saving && <span className="text-folk-terracotta">저장 중…</span>}
          {saved && <span className="text-primary">저장됨</span>}
        </div>
      </div>

      <AptHouseScene
        lat={lat}
        lng={lng}
        initialBuild={initialBuild}
        vrmUrl={vrmUrl}
        onBuildChange={onBuildChange}
      />

      <div className="grid gap-3 border-t border-[hsl(var(--folk-cobalt)/0.12)] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><Trees className="h-3.5 w-3.5" /> 도시</p>
          <p className="text-muted-foreground">18동 상가·인도·가로등·보행자</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><Hammer className="h-3.5 w-3.5" /> 건축 20종</p>
          <p className="text-muted-foreground">계단·수영장·소파·발코니 등</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> 실내</p>
          <p className="text-muted-foreground">문 클릭 또는 E — 1인칭 실내 이동</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><User className="h-3.5 w-3.5" /> 아바타</p>
          <p className="text-muted-foreground">VRM 야외 산책·휴식·인사</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/80 p-3 text-xs space-y-1">
          <p className="font-bold text-folk-cobalt flex items-center gap-1"><Car className="h-3.5 w-3.5" /> 운전</p>
          <p className="text-muted-foreground">WASD · 낮/밤 순환</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={manualSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          저장
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-xl">
          <Link href="/apt/move-in">입주 설정</Link>
        </Button>
      </div>
    </div>
  );
}
