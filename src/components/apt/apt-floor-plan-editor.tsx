"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Combine,
  LayoutGrid,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AptFloorPlanCanvas } from "@/components/apt/apt-floor-plan-canvas";
import {
  addRoom,
  canMerge,
  createDefaultFloorPlan,
  mergeRooms,
  removeRoom,
  splitRoom,
} from "@/lib/apt/floor-plan-logic";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

type Props = {
  floor: number;
};

export function AptFloorPlanEditor({ floor }: Props) {
  const [plans, setPlans] = useState<Record<number, AptRoom[]>>(() => {
    const d = createDefaultFloorPlan();
    return { [floor]: d.rooms };
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const rooms = plans[floor] ?? createDefaultFloorPlan().rooms;

  useEffect(() => {
    setSelected([]);
  }, [floor]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const setRooms = useCallback(
    (next: AptRoom[]) => {
      setPlans((p) => ({ ...p, [floor]: next }));
    },
    [floor]
  );

  const onSelect = (id: string, multi: boolean) => {
    setSelected((prev) => {
      if (multi) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return [id];
    });
  };

  const mergeable =
    selected.length === 2 &&
    (() => {
      const [a, b] = selected;
      const ra = rooms.find((r) => r.id === a);
      const rb = rooms.find((r) => r.id === b);
      return ra && rb && canMerge(ra, rb);
    })();

  const selectedFlexible = useMemo(
    () => selected.filter((id) => !rooms.find((r) => r.id === id)?.locked),
    [selected, rooms]
  );

  const handleRemove = () => {
    if (selectedFlexible.length !== 1) return;
    const next = removeRoom(rooms, selectedFlexible[0]);
    if (!next) {
      showToast("고정 공간은 삭제할 수 없습니다");
      return;
    }
    setRooms(next);
    setSelected([]);
    showToast("방을 삭제했습니다");
  };

  const handleMerge = () => {
    if (!mergeable) return;
    const next = mergeRooms(rooms, selected[0], selected[1]);
    if (!next) {
      showToast("인접한 방만 합칠 수 있습니다");
      return;
    }
    setRooms(next);
    setSelected([]);
    showToast("방을 합쳤습니다");
  };

  const handleSplit = () => {
    if (selectedFlexible.length !== 1) return;
    const next = splitRoom(rooms, selectedFlexible[0]);
    if (!next) {
      showToast("이 방은 더 나눌 수 없습니다");
      return;
    }
    setRooms(next);
    setSelected([]);
    showToast("방을 분할했습니다");
  };

  const handleAdd = () => {
    const next = addRoom(rooms);
    if (!next) {
      showToast("추가할 공간이 없습니다");
      return;
    }
    setRooms(next);
    showToast("방을 추가했습니다");
  };

  const handleReset = () => {
    setRooms(createDefaultFloorPlan().rooms);
    setSelected([]);
    showToast("기본 구조로 초기화했습니다");
  };

  return (
    <div className="flex h-full min-h-[360px] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--folk-cobalt)/0.15)] bg-[hsl(var(--folk-cream)/0.55)] px-3 py-2.5">
        <span className="mr-1 text-xs font-bold text-folk-cobalt">{floor}층 평면도</span>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          방 추가
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg text-xs"
          disabled={selectedFlexible.length !== 1}
          onClick={handleSplit}
        >
          <SplitSquareHorizontal className="h-3.5 w-3.5" />
          분할
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg text-xs"
          disabled={!mergeable}
          onClick={handleMerge}
        >
          <Combine className="h-3.5 w-3.5" />
          합치기
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg text-xs text-destructive hover:text-destructive"
          disabled={selectedFlexible.length !== 1}
          onClick={handleRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-xs ml-auto" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </Button>
      </div>

      <div className="relative flex-1 min-h-[320px]">
        <AptFloorPlanCanvas
          rooms={rooms}
          selectedIds={selected}
          onSelect={onSelect}
          onClearSelect={() => setSelected([])}
        />
        {toast && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/95 px-4 py-1.5 text-xs font-semibold text-folk-cobalt shadow-folk-sm">
            {toast}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[hsl(var(--folk-cobalt)/0.12)] bg-background/80 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <LayoutGrid className="h-3 w-3" />
          고정: 현관 · 주방 · 화장실
        </span>
        <span>방 클릭 선택 · Shift 다중 선택 · 합치기는 인접한 2개 방</span>
      </div>
    </div>
  );
}
