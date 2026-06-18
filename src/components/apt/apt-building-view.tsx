"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronUp,
  Combine,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APT_DEFAULT_FLOOR,
  APT_TOTAL_FLOORS,
  AptBuildingScene,
} from "@/lib/apt/building-scene";
import {
  addRoom,
  canMerge,
  createDefaultFloorPlan,
  mergeRooms,
  removeRoom,
  splitRoom,
} from "@/lib/apt/floor-plan-logic";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { cn } from "@/lib/utils";

function initAllFloorPlans(): Record<number, AptRoom[]> {
  const d = createDefaultFloorPlan().rooms;
  const out: Record<number, AptRoom[]> = {};
  for (let f = 1; f <= APT_TOTAL_FLOORS; f++) {
    out[f] = d.map((r) => ({ ...r }));
  }
  return out;
}

export function AptBuildingView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AptBuildingScene | null>(null);
  const floorRef = useRef(APT_DEFAULT_FLOOR);
  const xrayRef = useRef(false);
  const plansRef = useRef<Record<number, AptRoom[]>>(initAllFloorPlans());

  const [floor, setFloor] = useState(APT_DEFAULT_FLOOR);
  const [xray, setXray] = useState(false);
  const [moving, setMoving] = useState(false);
  const [plans, setPlans] = useState(initAllFloorPlans);
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const rooms = plans[floor] ?? createDefaultFloorPlan().rooms;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const setRooms = useCallback(
    (next: AptRoom[]) => {
      plansRef.current = { ...plansRef.current, [floor]: next };
      setPlans((p) => ({ ...p, [floor]: next }));
      sceneRef.current?.updateFloorRooms(floor, next);
    },
    [floor]
  );

  const goToFloor = useCallback((next: number) => {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(1, next));
    if (clamped === floorRef.current) return;
    floorRef.current = clamped;
    setFloor(clamped);
    setSelected([]);
    setMoving(true);
    sceneRef.current?.setFloor(clamped);
    sceneRef.current?.setSelectedRoomIds([]);
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
    sceneRef.current?.setSelectedRoomIds(selected);
  }, [selected]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new AptBuildingScene(el);
    scene.setCallbacks({
      onFloorClick: (f) => goToFloor(f),
      onRoomClick: (id, multi) => {
        setSelected((prev) => {
          if (multi) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          return [id];
        });
      },
    });
    sceneRef.current = scene;
    plansRef.current = plans;
    scene.setFloorPlans(plans);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [goToFloor]);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  const mergeable = useMemo(() => {
    if (selected.length !== 2) return false;
    const ra = rooms.find((r) => r.id === selected[0]);
    const rb = rooms.find((r) => r.id === selected[1]);
    return !!(ra && rb && canMerge(ra, rb));
  }, [selected, rooms]);

  const selectedFlexible = selected.filter((id) => !rooms.find((r) => r.id === id)?.locked);

  const handleRemove = () => {
    if (selectedFlexible.length !== 1) return;
    const next = removeRoom(rooms, selectedFlexible[0]);
    if (!next) return showToast("고정 공간은 삭제할 수 없습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 삭제했습니다");
  };

  const handleMerge = () => {
    if (!mergeable) return;
    const next = mergeRooms(rooms, selected[0], selected[1]);
    if (!next) return showToast("인접한 방만 합칠 수 있습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 합쳤습니다");
  };

  const handleSplit = () => {
    if (selectedFlexible.length !== 1) return;
    const next = splitRoom(rooms, selectedFlexible[0]);
    if (!next) return showToast("이 방은 더 나눌 수 없습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 분할했습니다");
  };

  const handleAdd = () => {
    const next = addRoom(rooms);
    if (!next) return showToast("추가할 공간이 없습니다");
    setRooms(next);
    showToast("방을 추가했습니다");
  };

  const handleReset = () => {
    const d = createDefaultFloorPlan().rooms;
    setRooms(d.map((r) => ({ ...r })));
    setSelected([]);
    showToast("기본 구조로 초기화했습니다");
  };

  return (
    <div className="folk-card overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[min(80dvh,760px)]">
        <div className="relative flex-1 min-h-[480px] bg-[hsl(var(--folk-cream)/0.45)]">
          <div ref={mountRef} className="absolute inset-0" />

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-background/90 px-2.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            층 클릭 · {floor}층
          </div>

          <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/90 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
            휠 확대/축소 · 드래그 이동 · 방 클릭 선택
          </div>

          {moving && (
            <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center">
              <span className="rounded-full border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-background/90 px-3 py-1 text-xs font-semibold text-folk-cobalt animate-pulse">
                {floor}층으로 이동 중…
              </span>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-full border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/95 px-4 py-1.5 text-xs font-semibold text-folk-cobalt shadow-folk-sm">
              {toast}
            </div>
          )}

          <div className="absolute bottom-3 right-3 left-3 lg:left-auto lg:right-[8.5rem] flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/92 p-2 shadow-folk-sm backdrop-blur-md">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              방 추가
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" disabled={selectedFlexible.length !== 1} onClick={handleSplit}>
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              분할
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" disabled={!mergeable} onClick={handleMerge}>
              <Combine className="h-3.5 w-3.5" />
              합치기
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs text-destructive hover:text-destructive" disabled={selectedFlexible.length !== 1} onClick={handleRemove}>
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-xs" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              초기화
            </Button>
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

          <p className="text-[10px] text-muted-foreground tabular-nums">1 – {APT_TOTAL_FLOORS}층</p>
          <p className="text-[9px] text-center text-muted-foreground leading-snug px-1">
            고정: 현관·주방·화장실
          </p>
        </aside>
      </div>
    </div>
  );
}
