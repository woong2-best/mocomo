"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Armchair,
  Bed,
  Footprints,
  LayoutGrid,
  PersonStanding,
  Sofa,
  Sparkles,
  Trash2,
  Waves,
} from "lucide-react";
import { saveBondeeRoom } from "@/actions/apt-bondee";
import { IsometricRoomScene } from "@/lib/apt/bondee/isometric-room-scene";
import {
  BONDEE_FURNITURE_CATEGORIES,
  BONDEE_FURNITURE_LABELS,
  DEFAULT_BONDEE_ROOM,
  type BondeeFurnitureKind,
  type BondeeRoomState,
  type ChibiAvatarConfig,
  type ChibiPose,
} from "@/lib/apt/bondee/types";
import { cn } from "@/lib/utils";
import { AptChibiCustomizer } from "@/components/apt/apt-chibi-customizer";

const POSE_OPTIONS: { id: ChibiPose; label: string; icon: typeof Sofa }[] = [
  { id: "stand", label: "서기", icon: PersonStanding },
  { id: "sit", label: "앉기", icon: Sofa },
  { id: "lie", label: "눕기", icon: Bed },
  { id: "run", label: "운동", icon: Footprints },
  { id: "wave", label: "인사", icon: Waves },
];

export function AptBondeeRoom({
  initialState,
  isLoggedIn,
  onRoomChange,
}: {
  initialState: BondeeRoomState;
  isLoggedIn: boolean;
  onRoomChange?: (state: BondeeRoomState) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IsometricRoomScene | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState(initialState);
  const [panel, setPanel] = useState<"avatar" | "decor" | null>(null);
  const [decorCat, setDecorCat] = useState(0);
  const [placeTool, setPlaceTool] = useState<BondeeFurnitureKind | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(
    (next: BondeeRoomState) => {
      if (!isLoggedIn) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await saveBondeeRoom(next);
        setSaving(false);
      }, 900);
    },
    [isLoggedIn]
  );

  const applyState = useCallback(
    (next: BondeeRoomState) => {
      setState(next);
      sceneRef.current?.setState(next);
      onRoomChange?.(next);
      persist(next);
    },
    [onRoomChange, persist]
  );

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new IsometricRoomScene(el, initialState);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [initialState]);

  useEffect(() => {
    sceneRef.current?.setDecorMode(panel === "decor", placeTool);
  }, [panel, placeTool]);

  const onAvatarChange = (avatar: ChibiAvatarConfig) => {
    const next = { ...state, avatar };
    applyState(next);
  };

  const onPoseChange = (pose: ChibiPose) => {
    const next = { ...state, pose };
    applyState(next);
  };

  const onPlaceTool = (kind: BondeeFurnitureKind) => {
    setPlaceTool(kind);
    setPanel("decor");
  };

  const removeLast = () => {
    if (!state.items.length) return;
    const next = { ...state, items: state.items.slice(0, -1) };
    applyState(next);
  };

  return (
    <div className="folk-card overflow-hidden bg-white">
      <div className="relative min-h-[min(80dvh,820px)] bg-[#fef6f8]">
        <div ref={mountRef} className="absolute inset-0" />

        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          아이소메트릭 내 방{saving && " · 저장 중…"}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          {POSE_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              onClick={() => onPoseChange(p.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm transition-colors",
                state.pose === p.id ? "border-folk-terracotta text-folk-terracotta" : "border-neutral-200 text-neutral-600"
              )}
            >
              <p.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-white p-3 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === "avatar" ? null : "avatar")}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-xs font-bold transition-colors",
              panel === "avatar" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200"
            )}
          >
            <Sparkles className="h-4 w-4 inline mr-1" />
            아바타 꾸미기
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "decor" ? null : "decor")}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-xs font-bold transition-colors",
              panel === "decor" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200"
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-1" />
            방 꾸미기
          </button>
        </div>

        {panel === "avatar" && (
          <AptChibiCustomizer config={state.avatar} onChange={onAvatarChange} />
        )}

        {panel === "decor" && (
          <div className="space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {BONDEE_FURNITURE_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setDecorCat(i)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold border",
                    decorCat === i ? "border-folk-terracotta bg-folk-terracotta/10" : "border-neutral-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {placeTool ? `${BONDEE_FURNITURE_LABELS[placeTool]} 선택 — 방 바닥 클릭하여 배치` : "가구를 선택하세요"}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {BONDEE_FURNITURE_CATEGORIES[decorCat].kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onPlaceTool(kind)}
                  className={cn(
                    "rounded-xl border p-2 text-center text-[10px] font-semibold transition-colors",
                    placeTool === kind ? "border-folk-terracotta bg-folk-terracotta/10" : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <Armchair className="h-5 w-5 mx-auto mb-1 text-neutral-500" />
                  {BONDEE_FURNITURE_LABELS[kind]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={removeLast}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-bold text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                마지막 삭제
              </button>
              <button
                type="button"
                onClick={() => applyState(DEFAULT_BONDEE_ROOM)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-bold"
              >
                기본 방
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
