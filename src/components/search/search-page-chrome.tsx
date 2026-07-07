"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function SearchPageChrome({
  children,
  searchBar,
  hideTitle = false,
}: {
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  hideTitle?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div className={cn("max-w-2xl mx-auto min-w-0", !isNativeApp && "pb-nav lg:pb-6")}>
      <div
        className={cn(
          "sticky z-40 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3",
          isNativeApp
            ? "top-[calc(3.25rem+env(safe-area-inset-top))]"
            : "top-14"
        )}
      >
        {!hideTitle && (
          <h1 className={cn("text-xl font-bold mb-3", isNativeApp && "sr-only")}>검색</h1>
        )}
        {searchBar}
      </div>
      <div className={cn("min-w-0", hideTitle ? "px-0 py-0" : "p-4 space-y-6")}>{children}</div>
    </div>
  );
}
