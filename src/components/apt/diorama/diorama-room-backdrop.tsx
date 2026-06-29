"use client";

import { memo } from "react";
import { RoomShellSvg } from "@/components/apt/diorama/diorama-sprites";
import { getRoomTheme, BONDEE_ROOM_VIGNETTE } from "@/lib/diorama/room-themes";
import { cn } from "@/lib/utils";

function DioramaRoomBackdropInner({
  roomType,
  className,
}: {
  roomType: string;
  className?: string;
}) {
  const theme = getRoomTheme(roomType);

  return (
    <div className={cn("relative h-full w-full apt-bondee-world", className)}>
      <div className="apt-room-ambient pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="apt-room-particle apt-room-particle-1" />
        <span className="apt-room-particle apt-room-particle-2" />
        <span className="apt-room-particle apt-room-particle-3" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: BONDEE_ROOM_VIGNETTE }}
      />
      <svg
        viewBox="0 0 900 680"
        className="h-full w-full drop-shadow-[0_16px_40px_rgba(50,40,30,0.18)]"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <RoomShellSvg
          wallTop={theme.wallTop}
          wallBottom={theme.wallBottom}
          floorA={theme.floorA}
          floorB={theme.floorB}
          accent={theme.accent}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
    </div>
  );
}

export const DioramaRoomBackdrop = memo(DioramaRoomBackdropInner);
