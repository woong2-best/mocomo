"use client";

import { useCallback, useState } from "react";
import type { BuildTool, HouseBuildState, HouseWorldMode, OutdoorActivity } from "@/lib/apt/house/build-types";
import { BUILD_TOOL_GROUPS, BUILD_TOOL_LABELS } from "@/lib/apt/house/build-types";

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
  const [mode, setMode] = useState<HouseWorldMode>("explore");
  const [activity, setActivity] = useState<OutdoorActivity>("idle");
  const [inside, setInside] = useState(false);
  const [buildState, setBuildState] = useState(initialBuild);

  const setTool = useCallback((tool: BuildTool) => {
    setMode("build");
    if (readOnly || tool === "erase") return;
    const piece = {
      id: `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: tool,
      gx: ((buildState.pieces.length * 2) % 9) - 4,
      gz: (Math.floor(buildState.pieces.length / 5) % 7) - 3,
      gy: 0,
      rot: 0 as const,
    };
    const next = { ...buildState, pieces: [...buildState.pieces, piece] };
    setBuildState(next);
    onBuildChange?.(next);
  }, [buildState, onBuildChange, readOnly]);

  const setWorldMode = useCallback((m: HouseWorldMode) => {
    setMode(m);
    setInside(m === "interior" || m === "city_interior");
    if (m === "avatar") setActivity("walk");
    else if (m === "explore") setActivity("idle");
  }, []);

  const allTools: BuildTool[] = [
    ...BUILD_TOOL_GROUPS.structure,
    ...BUILD_TOOL_GROUPS.outdoor,
    ...BUILD_TOOL_GROUPS.furniture,
    "erase",
  ];

  return (
    <div className="relative min-h-[min(75dvh,720px)]">
      <div className="absolute inset-0 overflow-hidden rounded-none bg-gradient-to-br from-emerald-100 via-sky-100 to-amber-100">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-1/2 top-1/2 h-[min(62dvh,520px)] w-[min(88vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-4 border-slate-900 bg-white/80 p-4 shadow-2xl">
          <div className="relative h-full w-full rounded-[1.25rem] border-2 border-slate-800 bg-lime-100">
            <div className="absolute left-1/2 top-1/2 h-44 w-52 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-slate-900 bg-amber-100 shadow-lg">
              <div className="absolute -top-10 left-1/2 h-12 w-60 -translate-x-1/2 rounded-t-3xl border-4 border-slate-900 bg-rose-200" />
              <div className="absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 rounded-t-2xl border-4 border-slate-900 bg-white" />
            </div>
            {buildState.pieces.map((piece, index) => (
              <button
                key={piece.id}
                type="button"
                className="absolute z-10 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-800 bg-white text-[10px] font-black text-slate-800 shadow-md"
                style={{
                  left: `${50 + piece.gx * 6 + (index % 2) * 2}%`,
                  top: `${50 + piece.gz * 7}%`,
                }}
                title={BUILD_TOOL_LABELS[piece.kind]}
              >
                {BUILD_TOOL_LABELS[piece.kind].slice(0, 1)}
              </button>
            ))}
            <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-slate-900/15 bg-white/85 px-3 py-2 text-center text-xs font-black text-slate-700">
              2D 주택 보드 · 도구를 누르면 평면 블록이 추가됩니다
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/25 bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm space-y-0.5 max-w-[200px]">
        <p className="font-bold">
          {MODE_LABELS[mode]} 모드{inside ? " · 실내" : ""}
        </p>
        {visitLabel && <p className="text-folk-terracotta text-[10px] truncate">{visitLabel} 집</p>}
        {mode === "avatar" && <p className="text-[10px]">활동: {ACTIVITY_LABELS[activity]}</p>}
        {vrmUrl && <p className="text-[10px] text-green-300">2D 아바타 연결됨</p>}
        <p className="text-white/75 text-[10px]">도구 선택 · 평면 블록 배치</p>
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
