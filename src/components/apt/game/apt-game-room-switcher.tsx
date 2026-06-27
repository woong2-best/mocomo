"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

function AptGameRoomSwitcherInner({ rooms }: { rooms: AptRoom[] }) {
  const { activeRoomId, enterRoom, editMode, view } = useAptGameRequired();

  if (view !== "room") return null;

  const tabs = rooms.filter(
    (r) => r.type !== "hall" && r.type !== "balcony" && getDioramaPreset(r.id, r.type)
  );

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[86] flex justify-center px-3",
        editMode
          ? "top-[calc(max(0.5rem,env(safe-area-inset-top))+5.75rem)]"
          : "top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)]"
      )}
    >
      <div className="apt-game-room-switcher flex max-w-md gap-1 overflow-x-auto rounded-full p-1 [-webkit-overflow-scrolling:touch]">
        {tabs.map((room, i) => {
          const active = room.id === activeRoomId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => enterRoom(room.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition active:scale-95",
                active ? "bg-[#5c4033] text-white shadow-md" : "bg-white/85 text-[#8b7355]"
              )}
            >
              {i + 1}. {room.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AptGameRoomSwitcher = memo(AptGameRoomSwitcherInner);
