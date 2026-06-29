"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export type AptGameToastKind = "default" | "gold" | "energy" | "mission";

function AptGameToastInner({
  message,
  kind = "default",
}: {
  message: string | null;
  kind?: AptGameToastKind;
}) {
  if (!message) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(max(4.75rem,env(safe-area-inset-bottom))+0.5rem)] z-[110] flex justify-center px-4">
      <div
        className={cn(
          "apt-game-toast animate-in fade-in slide-in-from-bottom-2 max-w-sm rounded-2xl px-4 py-2.5 text-center text-[11px] font-black shadow-lg",
          kind === "gold" && "apt-game-toast-gold",
          kind === "energy" && "apt-game-toast-energy",
          kind === "mission" && "apt-game-toast-mission",
          kind === "default" && "apt-game-toast-default"
        )}
      >
        {message}
      </div>
    </div>
  );
}

export const AptGameToast = memo(AptGameToastInner);
