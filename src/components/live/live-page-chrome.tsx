"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function LivePageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div className={cn("live-page-shell", isNativeApp && "native-live-pad")}>
      <div
        className={cn(
          "max-w-6xl mx-auto space-y-8 p-4 lg:p-6 min-w-0",
          isNativeApp ? "pb-safe" : "pb-8"
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
