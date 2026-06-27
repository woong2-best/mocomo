"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

const ROOM_COLORS: Record<string, string> = {
  living: "from-amber-100 to-orange-100",
  bedroom: "from-sky-100 to-indigo-100",
  kitchen: "from-lime-100 to-emerald-100",
  bathroom: "from-cyan-100 to-teal-100",
  entrance: "from-stone-100 to-neutral-200",
};

function AptMultiRoomOverviewInner({ rooms }: { rooms: AptRoom[] }) {
  const { enterRoom } = useAptGameRequired();

  const visible = rooms.filter(
    (r) =>
      r.type !== "hall" &&
      r.type !== "balcony" &&
      getDioramaPreset(r.id, r.type)
  );

  return (
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-y-auto bg-gradient-to-b from-[#f5ebe0] to-[#e8dfd4] px-4 pb-28 pt-[calc(max(0.5rem,env(safe-area-inset-top))+7.5rem)]">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-lg font-black text-[#5c4033]">우리 집</h1>
        <p className="mb-4 text-center text-[10px] font-medium text-[#8b7355]">
          방을 탭해서 들어가거나 꾸며 보세요
        </p>

        <div
          className="relative mx-auto aspect-[4/5] w-full max-w-[320px]"
          style={{ perspective: "900px" }}
        >
          <div
            className="absolute inset-[8%] rounded-3xl border-4 border-[#c4a882] bg-[#faf6f0] shadow-[0_20px_60px_rgba(92,64,51,0.2)]"
            style={{ transform: "rotateX(12deg) rotateZ(-2deg)" }}
          >
            <div className="grid h-full grid-cols-2 grid-rows-3 gap-1.5 p-2">
              {visible.map((room, i) => {
                const grad = ROOM_COLORS[room.type] ?? "from-[#efe6da] to-[#e0d4c8]";
                const span =
                  room.type === "living"
                    ? "col-span-2 row-span-2"
                    : room.type === "kitchen"
                      ? "col-span-2"
                      : "";
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => enterRoom(room.id)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 border-[#d4c4b0]/80 bg-gradient-to-br shadow-inner active:scale-[0.98]",
                      grad,
                      span
                    )}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="absolute inset-0 bg-[url('/diorama/stickers/living/room-shell.webp')] bg-contain bg-center bg-no-repeat opacity-30" />
                    <span className="absolute bottom-1.5 left-2 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black text-[#5c4033]">
                      {room.label}
                    </span>
                    {room.type === "living" && (
                      <span className="absolute right-2 top-2 text-lg">🛋️</span>
                    )}
                    {room.type === "bedroom" && (
                      <span className="absolute right-2 top-2 text-lg">🛏️</span>
                    )}
                    {room.type === "kitchen" && (
                      <span className="absolute right-2 top-2 text-lg">🍳</span>
                    )}
                    {room.type === "bathroom" && (
                      <span className="absolute right-2 top-2 text-lg">🛁</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {visible.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => enterRoom(r.id)}
              className="rounded-full border border-[#d4c4b0] bg-white/90 px-3 py-1.5 text-[10px] font-bold text-[#5c4033] active:scale-95"
            >
              {r.label} 입장
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
