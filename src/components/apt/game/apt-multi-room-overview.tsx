"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { AptDollhouseSvg } from "@/components/apt/game/apt-dollhouse-svg";
import { DioramaMiniPreview } from "@/components/apt/diorama/diorama-mini-preview";
import { useAptGameRequired } from "./apt-game-context";

function AptMultiRoomOverviewInner({
  rooms,
  layoutOwnerUserId,
}: {
  rooms: AptRoom[];
  layoutOwnerUserId?: string | null;
}) {
  const { enterRoom, game } = useAptGameRequired();

  const visible = rooms.filter(
    (r) =>
      r.type !== "hall" &&
      r.type !== "balcony" &&
      getDioramaPreset(r.id, r.type)
  );

  return (
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-hidden bg-gradient-to-b from-[#faf3ea] via-[#f0e6d8] to-[#e5d9c8]">
      <div className="pointer-events-none absolute inset-0 apt-game-overview-pattern" />

      <div className="absolute inset-x-0 bottom-[calc(max(5rem,env(safe-area-inset-bottom))+0.25rem)] top-[calc(max(0.5rem,env(safe-area-inset-top))+3.5rem)] flex flex-col px-3">
        <div className="mx-auto mb-2 flex w-full max-w-md items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a08968]">My Home</p>
            <p className="text-lg font-black text-[#4a3428]">우리 집</p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-1.5 text-[10px] font-black text-[#5c4033] shadow-sm">
            ⚡ {game.energy}/{game.maxEnergy}
          </div>
        </div>

        <div className="relative mx-auto min-h-0 w-full max-w-md flex-1">
          <AptDollhouseSvg
            rooms={visible.map((r) => ({ id: r.id, label: r.label, type: r.type }))}
            onRoomClick={enterRoom}
            className="mx-auto h-full max-h-[min(52dvh,420px)] w-auto"
          />
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-md gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {visible.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => enterRoom(room.id)}
              className="shrink-0 active:scale-95"
            >
              <DioramaMiniPreview
                roomId={room.id}
                roomType={room.type}
                layoutOwnerUserId={layoutOwnerUserId}
                className="h-20 w-[4.75rem]"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
