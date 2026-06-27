"use client";

import { memo } from "react";
import Image from "next/image";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

/** apt-overview.png 위 클릭 영역 (퍼센트) */
const ROOM_HOTSPOTS: Record<string, { top: string; left: string; width: string; height: string }> = {
  living: { top: "38%", left: "6%", width: "58%", height: "42%" },
  kitchen: { top: "8%", left: "48%", width: "44%", height: "32%" },
  "bedroom-1": { top: "8%", left: "6%", width: "36%", height: "30%" },
  "bedroom-2": { top: "8%", left: "6%", width: "36%", height: "30%" },
  bathroom: { top: "6%", left: "78%", width: "18%", height: "22%" },
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
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-hidden bg-gradient-to-b from-[#faf3ea] via-[#f0e6d8] to-[#e5d9c8]">
      <div className="pointer-events-none absolute inset-0 apt-game-overview-pattern" />

      <div className="absolute inset-x-0 bottom-[calc(max(5rem,env(safe-area-inset-bottom))+0.5rem)] top-[calc(max(0.5rem,env(safe-area-inset-top))+7.5rem)] flex items-center justify-center px-2">
        <div className="apt-game-dollhouse relative aspect-[3/4] h-full max-h-full w-auto max-w-[min(100%,380px)]">
          <Image
            src="/diorama/apt-overview.png"
            alt="우리 집"
            fill
            priority
            sizes="(max-width: 480px) 100vw, 380px"
            className="object-contain drop-shadow-[0_28px_56px_rgba(74,52,40,0.22)]"
          />

          {visible.map((room, i) => {
            const spot =
              ROOM_HOTSPOTS[room.id] ??
              ROOM_HOTSPOTS[room.type] ??
              ROOM_HOTSPOTS.living;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => enterRoom(room.id)}
                className={cn(
                  "apt-game-room-hotspot absolute rounded-2xl border-2 border-transparent transition",
                  "hover:border-amber-300/60 hover:bg-amber-200/10 active:scale-[0.98] active:border-amber-400/80 active:bg-amber-200/20"
                )}
                style={{
                  top: spot.top,
                  left: spot.left,
                  width: spot.width,
                  height: spot.height,
                  animationDelay: `${i * 80}ms`,
                }}
                aria-label={`${room.label} 입장`}
              >
                <span className="absolute left-2 top-2 rounded-lg bg-white/92 px-2 py-1 text-[10px] font-black text-[#5c4033] shadow-md backdrop-blur-sm">
                  {room.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(5rem,env(safe-area-inset-bottom))+0.25rem)] flex justify-center px-4">
        <p className="rounded-full bg-white/80 px-4 py-1.5 text-[10px] font-bold text-[#8b7355] shadow-sm backdrop-blur-sm">
          방을 탭해서 들어가세요 · 가구 탭에서 꾸미기
        </p>
      </div>
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
