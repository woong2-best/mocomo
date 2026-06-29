"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function MarketPageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "p-4 lg:p-6 max-w-4xl mx-auto space-y-6 min-w-0",
        isNativeApp ? "pb-native-fab" : "pb-nav lg:pb-6"
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
