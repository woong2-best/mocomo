"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function SearchPageChrome({
  children,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "mx-auto min-h-[calc(100dvh-3.5rem)] w-full min-w-0 max-w-7xl px-4 lg:px-6 pt-2",
        !isNativeApp && "pb-nav lg:pb-6"
      )}
    >
      <div className="min-w-0">{children}</div>
    </div>
  );
}
