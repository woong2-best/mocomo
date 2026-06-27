"use client";

import { memo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

function AptGameMissionSheetInner() {
  const { game, missionOpen, setMissionOpen, claimMission } = useAptGameRequired();
  const [tab, setTab] = useState<"daily" | "story">("daily");
  const [toast, setToast] = useState<string | null>(null);

  if (!missionOpen) return null;

  const missions = game.missions.filter((m) => m.kind === tab);
  const dailyAll = game.missions.filter((m) => m.kind === "daily");
  const dailyDone = dailyAll.filter((m) => m.completed).length;

  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="apt-game-sheet max-h-[78dvh] overflow-hidden rounded-t-[1.75rem]">
        <div className="flex items-center justify-between border-b border-[#e8dcc8] px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#5c4033]">미션</h2>
            <p className="text-[10px] text-[#8b7355]">오늘의 미션 {dailyDone}/{dailyAll.length}</p>
          </div>
          <button type="button" onClick={() => setMissionOpen(false)} className="rounded-full p-2">
            <X className="h-5 w-5 text-[#5c4033]" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {(["daily", "story"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[11px] font-bold",
                tab === k ? "bg-[#5c4033] text-white" : "bg-white text-[#8b7355]"
              )}
            >
              {k === "daily" ? "일일 미션" : "스토리 미션"}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {toast && (
            <p className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-[10px] font-bold text-emerald-800">
              {toast}
            </p>
          )}
          {missions.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl apt-game-shop-card p-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#efe6da] text-xl">
                {m.completed ? "✅" : "🎯"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-[#5c4033]">{m.title}</p>
                <p className="text-[10px] text-[#8b7355]">{m.description}</p>
                <p className="mt-1 text-[9px] font-bold text-amber-700">
                  +{m.goldReward}G · +{m.gemReward}💎
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold text-[#5c4033]">
                  {m.progress}/{m.target}
                </p>
                {m.completed && !m.claimed ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await claimMission(m.id);
                      if (res.error) setToast(res.error);
                      else setToast(`+${m.goldReward}G 받았어요!`);
                    }}
                    className="mt-1 rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-black text-white"
                  >
                    받기
                  </button>
                ) : m.claimed ? (
                  <span className="text-[9px] font-bold text-emerald-600">완료</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const AptGameMissionSheet = memo(AptGameMissionSheetInner);
