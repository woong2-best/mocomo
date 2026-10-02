"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";

function RoomPortalOverlayInner({
  rooms,
  activeRoomId,
  onSelectRoom,
  onExitCorridor,
  onClose,
}: {
  rooms: AptRoom[];
  activeRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onExitCorridor: () => void;
  onClose: () => void;
}) {
  const visible = rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative z-[1] mx-4 w-full max-w-[240px] rounded-2xl border-2 border-[#5c4033]/25 bg-gradient-to-b from-[#faf3ea] to-[#efe4d6] p-4 shadow-2xl">
        <p className="text-center text-[11px] font-bold text-[#5c4033]">현관문 · 다른 공간</p>
        <p className="mt-1 text-center text-[9px] text-[#8b7355]">가고 싶은 방을 선택하세요</p>
        <div className="mt-3 space-y-1.5">
          {visible.map((room) => {
            const ready = !!getDioramaPreset(room.id, room.type);
            return (
              <button
                key={room.id}
                type="button"
                disabled={!ready}
                onClick={() => {
                  onSelectRoom(room.id);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[10px] font-bold transition active:scale-[0.98]",
                  activeRoomId === room.id
                    ? "border-[#5c4033]/30 bg-[#5c4033]/10 text-[#5c4033]"
                    : "border-[#5c4033]/15 bg-white/60 text-[#6b5744]",
                  !ready && "opacity-45"
                )}
              >
                <span>🚪 {room.label}</span>
                {!ready && <span className="text-[8px] font-normal">준비 중</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            onExitCorridor();
            onClose();
          }}
          className="mt-3 w-full rounded-xl border border-[#5c4033]/20 bg-[#5c4033] py-2.5 text-[10px] font-bold text-[#faf3ea] shadow-md active:scale-[0.98]"
        >
          🏃 현관으로 나가기
        </button>
      </div>
    </div>
  );
}

export const RoomPortalOverlay = memo(RoomPortalOverlayInner);
