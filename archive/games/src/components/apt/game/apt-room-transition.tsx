"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function AptRoomTransitionInner({
  phase,
  children,
  className,
}: {
  phase: "enter" | "idle" | "exit";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        phase === "enter" && "apt-room-enter",
        phase === "exit" && "apt-room-exit",
        phase === "idle" && "apt-room-idle",
        className
      )}
    >
      {children}
    </div>
  );
}

export const AptRoomTransition = memo(AptRoomTransitionInner);
