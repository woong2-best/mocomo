"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptEmptyHouse3D } from "./apt-empty-house-3d";
import { useAptGameRequired } from "./apt-game-context";

function AptMultiRoomOverviewInner({ rooms }: { rooms: AptRoom[] }) {
  const { enterRoom, firstEntry } = useAptGameRequired();

  return (
    <div
      className="apt-game-overview apt-bondee-world pointer-events-auto absolute inset-0 z-[50] overflow-hidden bg-[#f5ebe0]"
      style={{
        opacity: firstEntry.overviewRevealOpacity,
        transform: `scale(${0.96 + firstEntry.overviewRevealOpacity * 0.04})`,
        transition: firstEntry.phase === "reveal" ? "none" : "opacity 0.3s ease",
      }}
    >
      <AptEmptyHouse3D rooms={rooms} onRoomClick={enterRoom} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(42,31,20,0.06)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-[#2a1f14]/10" />

      {firstEntry.hudVisible && (
        <>
      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+5.5rem)] flex justify-center">
        <span className="rounded-full border border-[#5c4033]/8 bg-white/70 px-3.5 py-1 text-[10px] font-bold tracking-wide text-[#5c4033]/70 shadow-sm backdrop-blur-sm">
          빈 집 구조
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(4.75rem,env(safe-area-inset-bottom))+0.5rem)] flex justify-center">
        <span className="rounded-full border border-[#5c4033]/10 bg-white/80 px-3 py-1 text-[10px] font-bold text-[#5c4033]/75 shadow-sm backdrop-blur-sm">
          방을 탭하면 들어갈 수 있어요
        </span>
      </div>
        </>
      )}
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
