"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function SearchPageChrome({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div className={cn("max-w-2xl mx-auto min-w-0", !isNativeApp && "pb-nav lg:pb-6")}>
      <div className={cn("min-w-0", compact ? "px-0 py-0" : "p-4 space-y-6")}>{children}</div>
    </div>
  );
}
