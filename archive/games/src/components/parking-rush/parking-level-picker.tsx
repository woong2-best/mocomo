"use client";

import { levelsForPicker } from "@/lib/minigames/parking-rush-levels";
import { MAP_TYPE_LABELS } from "@/lib/minigames/parking-rush-logic";
import { cn } from "@/lib/utils";

type Props = {
  levelId: string;
  onLevelId: (id: string) => void;
};

const DIFF_LABEL: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
  expert: "전문가",
};

export function ParkingLevelPicker({ levelId, onLevelId }: Props) {
  const levels = levelsForPicker();

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-cyan-100">맵 선택</p>
      <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onLevelId(l.id)}
            className={cn(
              "w-full text-left rounded-xl border px-3 py-2.5 transition-colors",
              levelId === l.id
                ? "border-cyan-400/60 bg-cyan-950/40"
                : "border-white/10 bg-black/20 hover:border-cyan-500/30"
            )}
          >
            <span className="font-bold text-sm text-cyan-50">{l.name}</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5">
              {MAP_TYPE_LABELS[l.mapType]} · {DIFF_LABEL[l.difficulty] ?? l.difficulty} · {l.timeLimitSec}초
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
