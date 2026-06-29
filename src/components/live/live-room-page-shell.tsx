"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function LiveRoomPageShell({
  isHost,
  children,
}: {
  isHost: boolean;
  children: React.ReactNode;
}) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "live-page-shell max-w-[1600px] mx-auto px-2 sm:px-4",
        isHost ? "pb-4" : "space-y-3",
        !isHost && (isNativeApp ? "pb-safe" : "pb-24 lg:pb-4")
      )}
    >
      {children}
    </div>
  );
}
