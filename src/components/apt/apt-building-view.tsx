"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, ChevronDown, ChevronUp } from "lucide-react";
import { AptFloorPlanEditor } from "@/components/apt/apt-floor-plan-editor";
import {
  APT_DEFAULT_FLOOR,
  APT_TOTAL_FLOORS,
  AptBuildingScene,
} from "@/lib/apt/building-scene";
import { cn } from "@/lib/utils";

export function AptBuildingView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AptBuildingScene | null>(null);
  const floorRef = useRef(APT_DEFAULT_FLOOR);
  const xrayRef = useRef(false);
  const [floor, setFloor] = useState(APT_DEFAULT_FLOOR);
  const [xray, setXray] = useState(false);
  const [moving, setMoving] = useState(false);

  const goToFloor = useCallback((next: number) => {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(1, next));
    if (clamped === floorRef.current) return;
    floorRef.current = clamped;
    setFloor(clamped);
    setMoving(true);
    sceneRef.current?.setFloor(clamped);
    sceneRef.current?.setXray(true);
    window.setTimeout(() => {
      setMoving(false);
      sceneRef.current?.setXray(xrayRef.current);
    }, 520);
  }, []);

  useEffect(() => {
    xrayRef.current = xray;
    if (!moving) sceneRef.current?.setXray(xray);
  }, [xray, moving]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new AptBuildingScene(el);
    scene.setFloorClickHandler((f) => goToFloor(f));
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [goToFloor]);

  return (
    <div className="folk-card overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[min(78dvh,720px)]">
        <div className="relative flex flex-1 flex-col min-h-[420px] lg:min-h-0">
          <div className="relative h-[200px] shrink-0 border-b border-[hsl(var(--folk-cobalt)/0.12)] bg-[hsl(var(--folk-cream)/0.4)]">
            <div ref={mountRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-background/85 px-2.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              층 클릭 · {floor}층
            </div>
            {moving && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <span className="rounded-full border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-background/90 px-3 py-1 text-xs font-semibold text-folk-cobalt animate-pulse">
                  {floor}층으로 이동 중…
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[360px]">
            <AptFloorPlanEditor floor={floor} />
          </div>
        </div>

        <aside className="flex w-full lg:w-[7.5rem] shrink-0 flex-col items-center border-t-2 lg:border-t-0 lg:border-l-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-[hsl(var(--folk-cream)/0.65)] px-4 py-6 gap-3">
          <button
            type="button"
            onClick={() => setXray((v) => !v)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all",
              xray
                ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta shadow-folk-sm"
                : "border-[hsl(var(--folk-cobalt)/0.25)] bg-background text-folk-cobalt hover:bg-[hsl(var(--folk-gold)/0.15)]"
            )}
            aria-label="집 구조 투명 보기"
            title="집 구조 투명 보기"
          >
            <Box className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <p className="text-[10px] text-center leading-snug text-muted-foreground px-1">
            {xray ? "내부 구조 표시" : "외벽 표시"}
          </p>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 w-full max-w-[4.5rem]">
            <button
              type="button"
              disabled={floor >= APT_TOTAL_FLOORS || moving}
              onClick={() => goToFloor(floor + 1)}
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border-2 border-[hsl(var(--folk-cobalt)/0.3)] bg-background text-folk-cobalt transition-all",
                "hover:bg-[hsl(var(--folk-gold)/0.12)] hover:-translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              )}
              aria-label="위층"
            >
              <ChevronUp className="h-7 w-7" strokeWidth={2.5} />
            </button>

            <div
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-xl border-[3px] border-[hsl(var(--folk-cobalt)/0.35)] bg-background font-display text-3xl font-bold tabular-nums text-folk-terracotta shadow-[inset_0_2px_8px_hsl(var(--folk-cobalt)/0.08)] transition-transform duration-300",
                moving && "scale-95"
              )}
            >
              {floor}
            </div>

            <button
              type="button"
              disabled={floor <= 1 || moving}
              onClick={() => goToFloor(floor - 1)}
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border-2 border-[hsl(var(--folk-cobalt)/0.3)] bg-background text-folk-cobalt transition-all",
                "hover:bg-[hsl(var(--folk-gold)/0.12)] hover:translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              )}
              aria-label="아래층"
            >
              <ChevronDown className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground tabular-nums">
            1 – {APT_TOTAL_FLOORS}층
          </p>
        </aside>
      </div>
    </div>
  );
}
