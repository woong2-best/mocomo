"use client";

import { memo } from "react";
import Image from "next/image";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

/** apt-overview.png 터치 영역 */
const ROOM_HOTSPOTS: Record<string, { top: string; left: string; width: string; height: string }> = {
  living: { top: "36%", left: "5%", width: "60%", height: "44%" },
  kitchen: { top: "7%", left: "47%", width: "46%", height: "33%" },
  "bedroom-1": { top: "7%", left: "5%", width: "38%", height: "30%" },
  "bedroom-2": { top: "7%", left: "5%", width: "38%", height: "30%" },
  bathroom: { top: "5%", left: "77%", width: "20%", height: "24%" },
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
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-hidden bg-[#e8dfd4]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="apt-game-hero-dollhouse relative h-full w-full max-w-lg">
          <Image
            src="/diorama/apt-overview.png"
            alt="우리 집"
            fill
            priority
            sizes="100vw"
            className="object-contain object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf3ea]/30 via-transparent to-[#e5d9c8]/50" />

          {visible.map((room) => {
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
                  "absolute rounded-2xl border-2 border-transparent transition",
                  "active:bg-white/10 hover:border-amber-300/40"
                )}
                style={{
                  top: spot.top,
                  left: spot.left,
                  width: spot.width,
                  height: spot.height,
                }}
                aria-label={`${room.label} 입장`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
