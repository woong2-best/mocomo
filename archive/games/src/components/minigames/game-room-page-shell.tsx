"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function GameRoomPageShell({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();
  return (
    <div className={cn("max-w-5xl mx-auto", isNativeApp ? "px-2 py-2 pb-safe" : "p-4 py-6")}>
      {children}
    </div>
  );
}
