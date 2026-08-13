"use client";

import { MarketSearchBar } from "@/components/market/market-search-bar";
import { MarketQuickActions } from "@/components/market/market-quick-actions";
import { cn } from "@/lib/utils";

export function MarketToolbar({
  initialQuery = "",
  className,
}: {
  initialQuery?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <MarketSearchBar initialQuery={initialQuery} compact className="min-w-0 flex-1" />
      <MarketQuickActions />
    </div>
  );
}
