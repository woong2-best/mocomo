"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildTool, HouseBuildState, HouseWorldMode, OutdoorActivity } from "@/lib/apt/house/build-types";
import { BUILD_TOOL_GROUPS, BUILD_TOOL_LABELS } from "@/lib/apt/house/build-types";
import { HouseWorldScene } from "@/lib/apt/house/world-scene";
import { useAptWorldSocket } from "@/hooks/use-apt-world-socket";

const MODE_LABELS: Record<HouseWorldMode, string> = {
  explore: "탐색",
  build: "건설",
  drive: "운전",
  avatar: "아바타",
  interior: "실내",
  city_interior: "도시실내",
};

const ACTIVITY_LABELS: Record<OutdoorActivity, string> = {
  idle: "대기",
  walk: "산책",
  sit: "휴식",
  wave: "인사",
};

export function AptHouseScene({
  lat,
  lng,
  initialBuild,
  vrmUrl,
  readOnly,
  visitLabel,
  onBuildChange,
}: {
  lat: number;
  lng: number;
  initialBuild: HouseBuildState;
  vrmUrl?: string;
  readOnly?: boolean;
  visitLabel?: string;
  onBuildChange?: (state: HouseBuildState) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HouseWorldScene | null>(null);
  const onBuildRef = useRef(onBuildChange);
  onBuildRef.current = onBuildChange;
  const [mode, setMode] = useState<HouseWorldMode>("explore");
  const [activity, setActivity] = useState<OutdoorActivity>("idle");
  const [inside, setInside] = useState(false);
  const { peers, emitMove } = useAptWorldSocket(lat, lng);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new HouseWorldScene(el, { state: initialBuild, vrmUrl, readOnly, visitLabel });
    scene.setCallbacks({
      onBuildChange: (s) => onBuildRef.current?.(s),
      onModeChange: setMode,
      onActivityChange: setActivity,
      onInteriorChange: setInside,
      onPositionChange: (pos) => emitMove(pos.x, pos.z, pos.mode, pos.activity),
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, initialBuild.worldSeed, vrmUrl, readOnly, visitLabel]);

  useEffect(() => {
    sceneRef.current?.syncRemotePlayers(peers);
  }, [peers]);

  const setTool = useCallback((tool: BuildTool) => {
    sceneRef.current?.setTool(tool);
    setMode("build");
  }, []);

  const setWorldMode = useCallback((m: HouseWorldMode) => {
    sceneRef.current?.setMode(m);
  }, []);

  const allTools: BuildTool[] = [
    ...BUILD_TOOL_GROUPS.structure,
    ...BUILD_TOOL_GROUPS.outdoor,
    ...BUILD_TOOL_GROUPS.furniture,
    "erase",
  ];

  return (
    <div className="relative min-h-[min(75dvh,720px)]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/25 bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm space-y-0.5 max-w-[200px]">
        <p className="font-bold">
          {MODE_LABELS[mode]} 모드{inside ? " · 실내" : ""}
        </p>
        {visitLabel && <p className="text-folk-terracotta text-[10px] truncate">{visitLabel} 집</p>}
        {mode === "avatar" && <p className="text-[10px]">활동: {ACTIVITY_LABELS[activity]}</p>}
        {peers.length > 0 && <p className="text-[10px] text-green-300">온라인 {peers.length}명</p>}
        <p className="text-white/75 text-[10px]">Tab · E/F 출입 · 도시 문 클릭</p>
      </div>
      {!readOnly && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-auto">
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/20 bg-black/50 p-1.5 backdrop-blur-md max-h-24 overflow-y-auto">
            {allTools.map((t) => (
              <button key={t} type="button" onClick={() => setTool(t)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-white/90 hover:bg-white/15">
                {BUILD_TOOL_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {(["explore", "build", "avatar", "drive"] as HouseWorldMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setWorldMode(m)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold border border-white/20 ${
                  mode === m ? "bg-folk-terracotta/90 text-white" : "bg-black/50 text-white"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
