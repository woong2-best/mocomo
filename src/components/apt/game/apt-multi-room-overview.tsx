"use client";

import { memo } from "react";
import Image from "next/image";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

/** apt-overview.png 터치 영역 (object-cover 기준) */
const ROOM_HOTSPOTS: Record<string, { top: string; left: string; width: string; height: string }> = {
  living: { top: "38%", left: "8%", width: "58%", height: "42%" },
  kitchen: { top: "10%", left: "48%", width: "44%", height: "30%" },
  "bedroom-1": { top: "10%", left: "8%", width: "36%", height: "28%" },
  "bedroom-2": { top: "10%", left: "8%", width: "36%", height: "28%" },
  bathroom: { top: "8%", left: "76%", width: "20%", height: "22%" },
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
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-hidden">
      <Image
        src="/diorama/apt-overview.png"
        alt="우리 집"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_38%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf3ea]/55 via-transparent to-[#2a1f14]/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(42,31,20,0.18)_100%)]" />

      <div className="absolute inset-x-0 bottom-[calc(max(4.75rem,env(safe-area-inset-bottom)))] top-[calc(max(0.5rem,env(safe-area-inset-top))+6.5rem)]">
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
                "active:bg-white/15 hover:border-amber-200/50"
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
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
