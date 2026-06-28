"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { DollhouseCanvas } from "@/components/apt/isometric/dollhouse-canvas";
import { useAptGameRequired } from "./apt-game-context";
import { cn } from "@/lib/utils";

function AptEmptyHouse3DInner({ rooms }: { rooms: AptRoom[] }) {
  const { enterRoom } = useAptGameRequired();
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);

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
    <div className="absolute inset-0 h-full w-full">
      {canvasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f2ebe3] px-6 text-center">
          <p className="text-xs font-bold text-[#5c4033]">3D 집 구조를 불러오지 못했습니다</p>
          <p className="text-[10px] text-[#5c4033]/70">{canvasError}</p>
        </div>
      ) : (
        <DollhouseCanvas
          rooms={rooms}
          highlightRoomId={hoverRoomId}
          clickableRoomIds={clickableRoomIds}
          cameraZoom={1}
          onRoomClick={handleRoomClick}
          onRoomHover={setHoverRoomId}
          onCanvasError={setCanvasError}
        />
      )}

      {hoverRoom && !canvasError && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(max(0.5rem,env(safe-area-inset-top))+7rem)] z-[60] -translate-x-1/2">
          <span
            className={cn(
              "rounded-full border border-[#5c4033]/12 bg-white/90 px-4 py-1.5",
              "text-[11px] font-bold text-[#5c4033] shadow-md backdrop-blur-md"
            )}
          >
            {hoverRoom.label} · 탭해서 입장
          </span>
        </div>
      )}
    </div>
  );
}

export const AptEmptyHouse3D = memo(AptEmptyHouse3DInner);
