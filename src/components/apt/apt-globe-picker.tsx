"use client";

import { useEffect, useRef, useState } from "react";
import { AptGlobeScene, type GlobePick } from "@/lib/apt/globe/globe-scene";
import { formatCoords } from "@/lib/apt/world/geo-math";

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
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AptGlobeScene | null>(null);
  const [pick, setPick] = useState<GlobePick | null>(null);
  const [zoom, setZoom] = useState(0);
  const onPickRef = useRef(onPick);
  const onZoomRef = useRef(onZoomChange);
  onPickRef.current = onPick;
  onZoomRef.current = onZoomChange;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new AptGlobeScene(el, initialCountryCode);
    scene.setCallbacks({
      onPick: (p) => {
        setPick(p);
        onPickRef.current?.(p);
      },
      onZoomChange: (z) => {
        setZoom(z);
        onZoomRef.current?.(z);
      },
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [initialCountryCode]);

  return (
    <div className="space-y-2">
      <div
        ref={mountRef}
        className="relative h-[min(52dvh,420px)] w-full overflow-hidden rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-[#0a1628]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>클릭으로 위치 선택 · 휠로 확대</span>
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
