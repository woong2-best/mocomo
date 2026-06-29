"use client";

import { memo, useState } from "react";
import { Gift, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AptMissionDef } from "@/lib/apt/game/types";
import { useAptGameRequired } from "./apt-game-context";

function missionAction(m: AptMissionDef): { label: string; kind: "claim" | "shop" | "edit" | "friends" | null } {
  if (m.completed && !m.claimed) return { label: "받기", kind: "claim" };
  if (m.claimed || (m.completed && m.claimed)) return { label: "완료", kind: null };
  if (m.visitFriend) return { label: "친구 방문", kind: "friends" };
  if (m.id === "story-buy-item") return { label: "상점", kind: "shop" };
  if (m.placeSticker || m.upgradeFurniture) return { label: "꾸미기", kind: "edit" };
  return { label: "이동", kind: "edit" };
}

function AptGameMissionSheetInner() {
  const {
    game,
    missionOpen,
    setMissionOpen,
    claimMission,
    setActiveTab,
    setShopOpen,
    dailyDone,
    dailyTotal,
  } = useAptGameRequired();
  const [tab, setTab] = useState<"daily" | "story">("daily");
  const [toast, setToast] = useState<string | null>(null);

  if (!missionOpen) return null;

  const missions = game.missions.filter((m) => m.kind === tab);
  const dailyPct = dailyTotal > 0 ? Math.round((dailyDone / dailyTotal) * 100) : 0;

  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="apt-game-sheet max-h-[82dvh] overflow-hidden rounded-t-[1.75rem]">
        <div className="flex items-center justify-between border-b border-[#e8dcc8]/80 px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#5c4033]">미션</h2>
            <p className="text-[10px] text-[#8b7355]">일일 · 스토리 미션으로 골드를 모아요</p>
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
                "rounded-full px-4 py-1.5 text-[11px] font-bold transition",
                tab === k
                  ? "bg-[#5c4033] text-white shadow-md"
                  : "bg-white text-[#8b7355] border border-[#e8dcc8]"
              )}
            >
              {k === "daily" ? "일일 미션" : "스토리 미션"}
            </button>
          ))}
        </div>

        {tab === "daily" && (
          <div className="mx-4 mt-3 rounded-2xl apt-game-mission-progress p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-[#5c4033]">오늘의 미션 완료!</span>
              <span className="text-[11px] font-bold text-[#8b7355]">
                {dailyDone}/{dailyTotal}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e8dcc8]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg shadow-sm">
                <Gift className="h-4 w-4 text-amber-700" />
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {toast && (
            <p className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-[10px] font-bold text-emerald-800">
              {toast}
            </p>
          )}
          {missions.map((m) => {
            const action = missionAction(m);
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl apt-game-mission-card p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#efe6da] text-xl">
                  {m.claimed ? "✅" : m.completed ? "🎁" : "🎯"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-[#5c4033]">{m.title}</p>
                  <p className="text-[10px] text-[#8b7355]">{m.description}</p>
                  <p className="mt-1 text-[9px] font-bold text-amber-700">+{m.goldReward}G</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!m.claimed && (
                    <span className="text-[10px] font-bold text-[#8b7355]">
                      {m.progress}/{m.target}
                    </span>
                  )}
                  {action.kind === "claim" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await claimMission(m.id);
                        if (res.error) setToast(res.error);
                        else setToast(`+${m.goldReward}G 받았어요!`);
                      }}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-black text-white shadow-sm"
                    >
                      {action.label}
                    </button>
                  ) : action.kind === "shop" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMissionOpen(false);
                        setActiveTab("shop");
                        setShopOpen(true);
                      }}
                      className="rounded-full bg-amber-500 px-3 py-1 text-[9px] font-black text-white shadow-sm"
                    >
                      {action.label}
                    </button>
                  ) : action.kind === "friends" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMissionOpen(false);
                        setActiveTab("friends");
                      }}
                      className="rounded-full bg-[#5c4033] px-3 py-1 text-[9px] font-black text-white shadow-sm"
                    >
                      {action.label}
                    </button>
                ) : action.kind === "edit" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMissionOpen(false);
                      setActiveTab("furniture");
                    }}
                    className="rounded-full bg-[#5c4033] px-3 py-1 text-[9px] font-black text-white shadow-sm"
                  >
                    {action.label}
                  </button>
                ) : m.completed && m.claimed ? (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-black text-white">
                    완료
                  </span>
                ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const AptGameMissionSheet = memo(AptGameMissionSheetInner);
