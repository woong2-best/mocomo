"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function MarketPageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "p-3 sm:p-4 lg:p-6 max-w-6xl xl:max-w-7xl mx-auto space-y-4 sm:space-y-5 min-w-0 w-full",
        !isNativeApp && "pb-nav lg:pb-6"
      )}
    >
      {children}
    </div>
  );
}

export function MarketPageTitle({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();
  return <div className={cn(isNativeApp && "sr-only")}>{children}</div>;
}
