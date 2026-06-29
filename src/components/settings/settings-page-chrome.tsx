"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function SettingsPageChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();
  return (
    <div className={cn("max-w-lg mx-auto p-4 space-y-6 min-w-0", isNativeApp ? "pb-native-fab" : "pb-nav lg:pb-4")}>
      {children}
    </div>
  );
}
