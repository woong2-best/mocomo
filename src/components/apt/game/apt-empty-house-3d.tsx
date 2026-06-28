"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useMemo, useState } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { useAptGameRequired } from "./apt-game-context";
import { cn } from "@/lib/utils";

const DollhouseCanvas = dynamic(
  () => import("@/components/apt/isometric/dollhouse-canvas").then((m) => m.DollhouseCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f2ebe3]">
        <div className="mb-3 h-8 w-8 animate-pulse rounded-full bg-[#d8cec0]/60" />
        <p className="text-xs font-semibold text-[#5c4033]/60">빈 집 구조 준비 중…</p>
      </div>
    ),
  }
);

function AptEmptyHouse3DInner({ rooms }: { rooms: AptRoom[] }) {
  const { enterRoom } = useAptGameRequired();
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);

  const clickableRoomIds = useMemo(() => {
    const ids = new Set<string>();
    for (const room of rooms) {
      if (room.type === "hall" || room.type === "entrance" || room.type === "balcony") continue;
      if (getDioramaPreset(room.id, room.type)) ids.add(room.id);
    }
    return ids;
  }, [rooms]);

  const hoverRoom = hoverRoomId ? rooms.find((r) => r.id === hoverRoomId) : null;

  const handleRoomClick = useCallback(
    (roomId: string) => {
      if (!clickableRoomIds.has(roomId)) return;
      enterRoom(roomId);
    },
    [clickableRoomIds, enterRoom]
  );

  return (
    <>
      <DollhouseCanvas
        rooms={rooms}
        highlightRoomId={hoverRoomId}
        clickableRoomIds={clickableRoomIds}
        cameraZoom={1}
        onRoomClick={handleRoomClick}
        onRoomHover={setHoverRoomId}
      />

      {hoverRoom && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(max(0.5rem,env(safe-area-inset-top))+7rem)] z-[60] -translate-x-1/2">
          <span
            className={cn(
              "rounded-full border border-[#5c4033]/12 bg-white/90 px-4 py-1.5",
              "text-[11px] font-bold text-[#5c4033] shadow-md backdrop-blur-md",
              "animate-in fade-in zoom-in-95 duration-150"
            )}
          >
            {hoverRoom.label} · 탭해서 입장
          </span>
        </div>
      )}
    </>
  );
}

export const AptEmptyHouse3D = memo(AptEmptyHouse3DInner);
