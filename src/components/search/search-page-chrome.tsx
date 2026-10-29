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
        "mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[600px] pt-2",
        !isNativeApp && "pb-nav lg:pb-6"
      )}
    >
      {children}
    </div>
  );
}
