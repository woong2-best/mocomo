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
    <div
      className={cn(
        "mx-auto min-h-[calc(100dvh-3.5rem)] w-full min-w-0 max-w-2xl",
        "lg:border-x lg:border-border/70",
        !isNativeApp && "pb-nav lg:pb-0"
      )}
    >
      <div className={cn("min-w-0", compact ? "" : "px-0")}>{children}</div>
    </div>
  );
}
