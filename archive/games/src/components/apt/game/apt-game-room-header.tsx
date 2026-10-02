"use client";

import { memo } from "react";
import { useAptGameRequired } from "./apt-game-context";

function AptGameRoomHeaderInner({
  roomLabel,
  roomIndex,
  onSave,
}: {
  roomLabel: string;
  roomIndex: number;
  onSave: () => void;
}) {
  const { editMode } = useAptGameRequired();
  if (!editMode) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+0.35rem)] z-[91] flex items-center justify-between px-3">
      <div className="apt-game-room-header-pill flex items-center gap-2 rounded-full px-3 py-2">
        <span className="text-[12px] font-black text-[#5c4033]">
          {roomIndex}. {roomLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onSave}
        className="apt-game-save-btn rounded-full px-5 py-2 text-[12px] font-black text-white active:scale-95"
      >
        저장
      </button>
    </div>
  );
}

export const AptGameRoomHeader = memo(AptGameRoomHeaderInner);
