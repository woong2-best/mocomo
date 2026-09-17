"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function LivePageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "live-page-shell live-hub-no-scroll",
        isNativeApp && "native-live-pad"
      )}
    >
      <div
        className={cn(
          "max-w-[1400px] mx-auto space-y-3 sm:space-y-4 p-4 lg:p-5 min-w-0",
          "flex flex-col h-full max-h-full",
          isNativeApp ? "pb-safe" : "pb-4"
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
