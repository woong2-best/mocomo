"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildTool, HouseBuildState, HouseWorldMode } from "@/lib/apt/house/build-types";
import { BUILD_TOOL_LABELS } from "@/lib/apt/house/build-types";
import { HouseWorldScene } from "@/lib/apt/house/world-scene";

export function AptHouseScene({
  lat,
  lng,
  initialBuild,
  onBuildChange,
}: {
  lat: number;
  lng: number;
  initialBuild: HouseBuildState;
  onBuildChange?: (state: HouseBuildState) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HouseWorldScene | null>(null);
  const onBuildRef = useRef(onBuildChange);
  const buildSeedRef = useRef(`${initialBuild.worldSeed}-${initialBuild.pieces.length}`);
  onBuildRef.current = onBuildChange;
  const [mode, setMode] = useState<HouseWorldMode>("explore");

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new HouseWorldScene(el, initialBuild);
    scene.setCallbacks({
      onBuildChange: (s) => onBuildRef.current?.(s),
      onModeChange: setMode,
    });
    sceneRef.current = scene;
    buildSeedRef.current = `${initialBuild.worldSeed}`;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per world seed
  }, [lat, lng, initialBuild.worldSeed]);

  const setTool = useCallback((tool: BuildTool) => {
    sceneRef.current?.setTool(tool);
    sceneRef.current?.setMode("build");
    setMode("build");
  }, []);

  const setWorldMode = useCallback((m: HouseWorldMode) => {
    sceneRef.current?.setMode(m);
    setMode(m);
  }, []);

  const rotate = useCallback(() => sceneRef.current?.rotatePiece(), []);

  return (
    <div className="relative min-h-[min(75dvh,720px)]">
      <div ref={mountRef} className="absolute inset-0" />
      <HouseSceneHud mode={mode} onTool={setTool} onMode={setWorldMode} onRotate={rotate} />
    </div>
  );
}

function HouseSceneHud({
  mode,
  onTool,
  onMode,
  onRotate,
}: {
  mode: HouseWorldMode;
  onTool: (t: BuildTool) => void;
  onMode: (m: HouseWorldMode) => void;
  onRotate: () => void;
}) {
  const tools: BuildTool[] = ["foundation", "wall", "floor", "roof", "door", "window", "fence", "tree", "lamp", "garage", "erase"];

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/25 bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm space-y-0.5">
        <p className="font-bold">
          {mode === "build" ? "건설 모드" : mode === "drive" ? "운전 모드" : "탐색 모드"}
        </p>
        <p className="text-white/75 text-[10px]">Tab 전환 · WASD 이동/운전 · R 회전</p>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/20 bg-black/50 p-1.5 backdrop-blur-md max-w-full">
          {tools.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTool(t)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-white/90 hover:bg-white/15 transition-colors"
            >
              {BUILD_TOOL_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMode("explore")} className="rounded-lg bg-black/50 px-2.5 py-1.5 text-[10px] font-bold text-white border border-white/20">
            탐색
          </button>
          <button type="button" onClick={() => onMode("build")} className="rounded-lg bg-black/50 px-2.5 py-1.5 text-[10px] font-bold text-white border border-white/20">
            건설
          </button>
          <button type="button" onClick={() => onMode("drive")} className="rounded-lg bg-folk-terracotta/90 px-2.5 py-1.5 text-[10px] font-bold text-white">
            운전
          </button>
          <button type="button" onClick={onRotate} className="rounded-lg bg-black/50 px-2.5 py-1.5 text-[10px] font-bold text-white border border-white/20">
            R 회전
          </button>
        </div>
      </div>
    </>
  );
}
