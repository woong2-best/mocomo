"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function LivePageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "live-page-shell live-hub-space",
        isNativeApp && "native-live-pad"
      )}
    >
      <div
        className={cn(
          "max-w-[1400px] mx-auto space-y-2 sm:space-y-3 p-3 lg:p-4 min-w-0",
          "flex flex-col",
          isNativeApp ? "pb-safe" : "pb-3"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function LivePageTitle({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();
  return <div className={cn(isNativeApp && "sr-only")}>{children}</div>;
}
